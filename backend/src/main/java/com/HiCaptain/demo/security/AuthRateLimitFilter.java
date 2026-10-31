package com.HiCaptain.demo.security;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.*;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import org.springframework.web.filter.OncePerRequestFilter;
public class AuthRateLimitFilter extends OncePerRequestFilter {
    private record Bucket(long expiresAt, int attempts) {}
    private final Map<String,Bucket> buckets = new HashMap<>();
    private final int limit;
    private final long windowMillis;
    public AuthRateLimitFilter(int limit, int seconds) {
        if (limit < 1 || seconds < 1) throw new IllegalArgumentException("Authentication rate limits must be positive");
        this.limit = limit; this.windowMillis = seconds * 1000L;
    }
    @Override protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain) throws IOException, ServletException {
        String path = request.getRequestURI();
        boolean protectedPath = "POST".equals(request.getMethod()) && Set.of("/auth/login", "/auth/register", "/auth/invitations/register", "/users/me/password").contains(path)
                || "GET".equals(request.getMethod()) && path.matches("/auth/oauth/(google|github)/start");
        if (!protectedPath || allow(request.getRemoteAddr())) { chain.doFilter(request, response); return; }
        response.setStatus(429); response.setHeader("Retry-After", Long.toString(windowMillis / 1000));
        response.setContentType("application/json"); response.getWriter().write("{\"message\":\"Too many authentication attempts. Try again shortly.\"}");
    }
    private synchronized boolean allow(String address) {
        long now = System.currentTimeMillis();
        buckets.entrySet().removeIf(entry -> entry.getValue().expiresAt() <= now);
        Bucket bucket = buckets.get(address);
        if (bucket == null) {
            if (buckets.size() >= 10000) return false;
            buckets.put(address, new Bucket(now + windowMillis, 1)); return true;
        }
        if (bucket.attempts() >= limit) return false;
        buckets.put(address, new Bucket(bucket.expiresAt(), bucket.attempts()+1)); return true;
    }
}
