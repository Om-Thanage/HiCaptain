package com.HiCaptain.demo.service;

import com.HiCaptain.demo.controller.AuthController;
import com.HiCaptain.demo.model.Membership;
import com.HiCaptain.demo.model.SocialIdentity;
import com.HiCaptain.demo.model.SocialLoginTicket;
import com.HiCaptain.demo.model.User;
import com.HiCaptain.demo.repository.SocialIdentityRepository;
import com.HiCaptain.demo.repository.SocialLoginTicketRepository;
import com.HiCaptain.demo.repository.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Comparator;
import java.util.Locale;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class SocialAuthService {
    private final UserRepository users;
    private final SocialIdentityRepository identities;
    private final SocialLoginTicketRepository tickets;
    private final MongoTemplate mongo;
    private final OrganizationService organizations;
    private final PasswordEncoder passwords;
    private final AuthController auth;
    private final ObjectMapper json;
    private final SecureRandom random = new SecureRandom();
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();

    @Value("${auth.github.client-id:}") private String githubClientId;
    @Value("${auth.github.client-secret:}") private String githubClientSecret;
    @Value("${auth.github.redirect-uri:}") private String githubRedirectUri;
    @Value("${google.workspace.client-id:}") private String googleClientId;
    @Value("${google.workspace.client-secret:}") private String googleClientSecret;
    @Value("${auth.google.redirect-uri:}") private String googleRedirectUri;

    public SocialAuthService(UserRepository users, SocialIdentityRepository identities,
            SocialLoginTicketRepository tickets, MongoTemplate mongo, OrganizationService organizations,
            PasswordEncoder passwords, AuthController auth, ObjectMapper json) {
        this.users = users;
        this.identities = identities;
        this.tickets = tickets;
        this.mongo = mongo;
        this.organizations = organizations;
        this.passwords = passwords;
        this.auth = auth;
        this.json = json;
    }

    public String authorizationUrl(String provider, String state) {
        checkProvider(provider);
        String clientId = provider.equals("github") ? githubClientId : googleClientId;
        String secret = provider.equals("github") ? githubClientSecret : googleClientSecret;
        String redirect = provider.equals("github") ? githubRedirectUri : googleRedirectUri;
        if (clientId.isBlank() || secret.isBlank() || redirect.isBlank())
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, provider + " sign-in is not configured");
        if (provider.equals("github")) return "https://github.com/login/oauth/authorize?client_id=" + enc(clientId)
                + "&redirect_uri=" + enc(redirect) + "&scope=" + enc("read:user user:email") + "&state=" + enc(state);
        return "https://accounts.google.com/o/oauth2/v2/auth?client_id=" + enc(clientId)
                + "&redirect_uri=" + enc(redirect) + "&response_type=code&scope=" + enc("openid email profile")
                + "&state=" + enc(state);
    }

    public String issueTicket(String provider, String code, String invitationToken) {
        checkProvider(provider);
        Profile profile = provider.equals("github") ? githubProfile(code) : googleProfile(code);
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        SocialLoginTicket ticket = new SocialLoginTicket();
        ticket.setTokenHash(hash(token));
        ticket.setExpiresAt(Instant.now().plus(Duration.ofMinutes(5)));
        ticket.setProvider(provider);
        ticket.setSubject(profile.subject());
        ticket.setEmail(profile.email().toLowerCase(Locale.ROOT));
        ticket.setName(profile.name());
        ticket.setInvitationToken(invitationToken);
        tickets.save(ticket);
        return token;
    }

    public record TicketPreview(String name, String email, boolean needsOrganization, String invitedOrganization) {}
    public TicketPreview preview(String token) {
        SocialLoginTicket ticket = validTicket(token);
        if (ticket.getInvitationToken() != null) {
            var invite = organizations.preview(ticket.getInvitationToken());
            if (!invite.email().equalsIgnoreCase(ticket.getEmail()))
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This account does not match the invitation email");
            return new TicketPreview(ticket.getName(), ticket.getEmail(), false, invite.organizationName());
        }
        Optional<User> user = findUser(ticket);
        return new TicketPreview(ticket.getName(), ticket.getEmail(),
                user.isEmpty() || organizations.membershipsFor(user.get().getId()).isEmpty(), null);
    }

    public AuthController.Session exchange(String token, String organizationName) {
        SocialLoginTicket ticket = validTicket(token);
        if (ticket.getInvitationToken() != null && !organizations.preview(ticket.getInvitationToken()).email().equalsIgnoreCase(ticket.getEmail()))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This account does not match the invitation email");
        Optional<User> existing = findUser(ticket);
        boolean needsOrganization = ticket.getInvitationToken() == null
                && (existing.isEmpty() || organizations.membershipsFor(existing.get().getId()).isEmpty());
        if (needsOrganization && (organizationName == null || organizationName.isBlank()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Organization name is required");
        SocialLoginTicket consumed = mongo.findAndRemove(
                Query.query(Criteria.where("tokenHash").is(hash(token)).and("expiresAt").gt(Instant.now())),
                SocialLoginTicket.class);
        if (consumed == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Sign-in link expired or already used");

        User user = existing.orElseGet(() -> createUser(ticket));
        Membership membership;
        try {
            membership = ticket.getInvitationToken() != null ? organizations.accept(ticket.getInvitationToken(), user)
                    : needsOrganization ? organizations.createOrganization(user, organizationName)
                    : organizations.membershipsFor(user.getId()).stream()
                            .sorted(Comparator.comparing(Membership::getOrganizationId)).findFirst().orElseThrow();
        } catch (RuntimeException failure) {
            if (existing.isEmpty()) users.deleteById(user.getId());
            throw failure;
        }
        String key = ticket.getProvider() + ":" + ticket.getSubject();
        if (identities.findByProviderSubject(key).isEmpty()) {
            SocialIdentity identity = new SocialIdentity();
            identity.setProviderSubject(key);
            identity.setUserId(user.getId());
            identities.save(identity);
        }
        return auth.session(user, membership);
    }

    private Optional<User> findUser(SocialLoginTicket ticket) {
        String key = ticket.getProvider() + ":" + ticket.getSubject();
        Optional<SocialIdentity> identity = identities.findByProviderSubject(key);
        if (identity.isPresent()) return Optional.of(users.findById(identity.get().getUserId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT, "Linked account no longer exists")));
        return users.findByEmailIgnoreCase(ticket.getEmail());
    }

    private User createUser(SocialLoginTicket ticket) {
        User user = new User();
        user.setName(ticket.getName());
        user.setEmail(ticket.getEmail());
        user.setPassword(passwords.encode(java.util.UUID.randomUUID().toString() + java.util.UUID.randomUUID()));
        return users.save(user);
    }

    private SocialLoginTicket validTicket(String token) {
        if (token == null || token.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing sign-in ticket");
        return tickets.findByTokenHash(hash(token)).filter(t -> t.getExpiresAt().isAfter(Instant.now()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Sign-in link expired or already used"));
    }

    private record Profile(String subject, String email, String name) {}
    private Profile githubProfile(String code) {
        JsonNode token = request("https://github.com/login/oauth/access_token", form("client_id", githubClientId,
                "client_secret", githubClientSecret, "code", code, "redirect_uri", githubRedirectUri), null);
        String accessToken = required(token, "access_token");
        JsonNode account = request("https://api.github.com/user", null, accessToken);
        JsonNode emails = request("https://api.github.com/user/emails", null, accessToken);
        String email = null;
        if (emails.isArray()) for (JsonNode item : emails) {
            if (item.path("primary").asBoolean() && item.path("verified").asBoolean()) {
                email = item.path("email").asText();
                break;
            }
        }
        if (email == null || email.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A verified primary GitHub email is required");
        String name = account.path("name").asText("");
        if (name.isBlank()) name = account.path("login").asText();
        return new Profile(required(account, "id"), email, name);
    }

    private Profile googleProfile(String code) {
        JsonNode token = request("https://oauth2.googleapis.com/token", form("client_id", googleClientId,
                "client_secret", googleClientSecret, "code", code, "redirect_uri", googleRedirectUri,
                "grant_type", "authorization_code"), null);
        JsonNode account = request("https://openidconnect.googleapis.com/v1/userinfo", null, required(token, "access_token"));
        if (!account.path("email_verified").asBoolean())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A verified Google email is required");
        return new Profile(required(account, "sub"), required(account, "email"), account.path("name").asText(required(account, "email")));
    }

    private JsonNode request(String url, String body, String accessToken) {
        try {
            HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create(url)).timeout(Duration.ofSeconds(15))
                    .header("Accept", "application/json").header("User-Agent", "HiCaptain");
            if (accessToken != null) builder.header("Authorization", "Bearer " + accessToken);
            if (body != null) builder.header("Content-Type", "application/x-www-form-urlencoded").POST(HttpRequest.BodyPublishers.ofString(body));
            else builder.GET();
            HttpResponse<String> response = http.send(builder.build(), HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() / 100 != 2) throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Identity provider rejected sign-in");
            return json.readTree(response.body());
        } catch (ResponseStatusException error) {
            throw error;
        } catch (Exception error) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Could not contact identity provider", error);
        }
    }

    private static String required(JsonNode node, String field) {
        String value = node.path(field).asText("");
        if (value.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Identity provider response was incomplete");
        return value;
    }

    private static String form(String... values) {
        StringBuilder result = new StringBuilder();
        for (int i = 0; i < values.length; i += 2) {
            if (i > 0) result.append('&');
            result.append(enc(values[i])).append('=').append(enc(values[i + 1]));
        }
        return result.toString();
    }

    private static String enc(String value) { return URLEncoder.encode(value, StandardCharsets.UTF_8); }
    private static String hash(String token) {
        try { return Base64.getUrlEncoder().withoutPadding().encodeToString(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8))); }
        catch (java.security.NoSuchAlgorithmException error) { throw new IllegalStateException(error); }
    }
    private static void checkProvider(String provider) {
        if (!provider.equals("github") && !provider.equals("google")) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
    }
}
