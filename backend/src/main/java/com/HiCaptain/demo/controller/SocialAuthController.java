package com.HiCaptain.demo.controller;

import com.HiCaptain.demo.service.JwtService;
import com.HiCaptain.demo.service.SocialAuthService;
import com.HiCaptain.demo.service.OrganizationService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.view.RedirectView;

@RestController
@RequestMapping("/auth/oauth")
public class SocialAuthController {
    private final SocialAuthService social;
    private final JwtService jwt;
    private final OrganizationService organizations;
    @Value("${app.frontend-url:http://localhost:3000}") private String frontendUrl;

    public SocialAuthController(SocialAuthService social, JwtService jwt, OrganizationService organizations) {
        this.social = social;
        this.jwt = jwt;
        this.organizations = organizations;
    }

    @GetMapping("/{provider}/start")
    public RedirectView start(@PathVariable String provider, @RequestParam(required = false) String invitation,
            HttpServletRequest request, HttpServletResponse response) {
        if (invitation != null && !invitation.isBlank()) organizations.preview(invitation);
        String state = jwt.generateOAuthState(UUID.randomUUID().toString(), "social-" + provider);
        String url = social.authorizationUrl(provider, state);
        String cookiePath = provider.equals("github") ? "/api/auth/github" : "/auth/oauth";
        response.addHeader("Set-Cookie", cookie("hc_social_state", state, request, 600, cookiePath));
        response.addHeader("Set-Cookie", cookie("hc_social_invite",
                invitation == null ? "" : invitation, request, invitation == null || invitation.isBlank() ? 0 : 600, cookiePath));
        return new RedirectView(url);
    }

    @GetMapping("/{provider}/callback")
    public RedirectView callback(@PathVariable String provider, @RequestParam(required = false) String code,
            @RequestParam(required = false) String state, @RequestParam(required = false) String error,
            HttpServletRequest request, HttpServletResponse response) {
        String cookieState = null;
        String invitation = null;
        if (request.getCookies() != null) for (var cookie : request.getCookies()) {
            if (cookie.getName().equals("hc_social_state")) cookieState = cookie.getValue();
            if (cookie.getName().equals("hc_social_invite")) invitation = cookie.getValue();
        }
        String cookiePath = request.getRequestURI().startsWith("/api/auth/github") ? "/api/auth/github" : "/auth/oauth";
        response.addHeader("Set-Cookie", cookie("hc_social_state", "", request, 0, cookiePath));
        response.addHeader("Set-Cookie", cookie("hc_social_invite", "", request, 0, cookiePath));
        if (state == null || cookieState == null || !MessageDigest.isEqual(
                state.getBytes(StandardCharsets.UTF_8), cookieState.getBytes(StandardCharsets.UTF_8)))
            return failure("Sign-in session expired. Please try again.");
        try {
            jwt.verifyOAuthState(state, "social-" + provider);
            if (error != null || code == null || code.isBlank()) return failure("Sign-in was cancelled or denied.");
            String ticket = social.issueTicket(provider, code, invitation);
            return new RedirectView(frontendUrl + "/auth/oauth/callback#ticket=" + ticket);
        } catch (Exception failure) {
            return failure("Could not sign in with " + provider + ". Please try again.");
        }
    }

    public record ExchangeRequest(String ticket, String organizationName) {}

    @GetMapping("/ticket")
    public SocialAuthService.TicketPreview ticket(@RequestParam String ticket) { return social.preview(ticket); }

    @PostMapping("/exchange")
    public AuthController.Session exchange(@RequestBody ExchangeRequest request) {
        if (request == null || request.ticket() == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        return social.exchange(request.ticket(), request.organizationName());
    }

    private RedirectView failure(String message) {
        return new RedirectView(frontendUrl + "/auth/oauth/callback?error=" + URLEncoder.encode(message, StandardCharsets.UTF_8));
    }

    private String cookie(String name, String value, HttpServletRequest request, int age, String path) {
        boolean secure = request.isSecure() || "https".equalsIgnoreCase(request.getHeader("X-Forwarded-Proto"));
        return name + "=" + value + "; Max-Age=" + age + "; Path=" + path + "; HttpOnly; SameSite=Lax" + (secure ? "; Secure" : "");
    }
}
