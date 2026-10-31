package com.HiCaptain.demo.service;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.HexFormat;
import java.util.UUID;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.query.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
@Service
public class OAuthFlowService {
    @Document("oauth_flows")
    public record Flow(@Id String id, String provider, String browserHash,
            @org.springframework.data.mongodb.core.mapping.Field("purgeAt") @Indexed(name="oauth_flow_expiration", expireAfter="0s") Instant expiresAt) {}
    private final MongoTemplate mongo;
    public OAuthFlowService(MongoTemplate mongo) { this.mongo = mongo; }
    public void bind(String state, String provider, HttpServletRequest request, HttpServletResponse response) {
        String nonce = UUID.randomUUID().toString();
        mongo.insert(new Flow(hash(state), provider, hash(nonce), Instant.now().plusSeconds(600)));
        cookie(provider, nonce, 600, request, response);
    }
    public void consume(String state, String provider, HttpServletRequest request, HttpServletResponse response) {
        String nonce = null;
        if (request.getCookies() != null) for (var cookie : request.getCookies())
            if (cookie.getName().equals(name(provider))) nonce = cookie.getValue();
        cookie(provider, "", 0, request, response);
        if (state == null || nonce == null) throw expired();
        Flow consumed = mongo.findAndRemove(Query.query(Criteria.where("_id").is(hash(state)).and("provider").is(provider)
                .and("browserHash").is(hash(nonce)).and("expiresAt").gt(Instant.now())), Flow.class);
        if (consumed == null) throw expired();
    }
    private void cookie(String provider, String value, int age, HttpServletRequest request, HttpServletResponse response) {
        boolean secure = request.isSecure() || "https".equalsIgnoreCase(request.getHeader("X-Forwarded-Proto"));
        response.addHeader("Set-Cookie", name(provider) + "=" + value + "; Max-Age=" + age + "; Path=/; HttpOnly; SameSite="
                + (secure ? "None; Secure" : "Lax"));
    }
    private String name(String provider) { return "hc_oauth_" + provider.replace('-', '_'); }
    private String hash(String value) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8))); }
        catch (Exception failure) { throw new IllegalStateException(failure); }
    }
    private ResponseStatusException expired() { return new ResponseStatusException(HttpStatus.BAD_REQUEST, "OAuth session expired, already used, or opened in a different browser. Reconnect and allow the backend's cookies."); }
}
