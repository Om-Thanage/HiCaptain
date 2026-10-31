package com.HiCaptain.demo.service;

import com.HiCaptain.demo.model.User;
import com.HiCaptain.demo.model.Membership;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.security.Key;
import java.util.Date;

@Service
public class JwtService {

    @Value("${security.jwt.secret}")
    private String secret;

    private Key getSignKey() {
        byte[] keyBytes = Decoders.BASE64.decode(secret);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    public String generateToken(User user, Membership membership) {
        return Jwts.builder()
                .claim("role", membership.getRoles().stream().min(java.util.Comparator.comparingInt(Enum::ordinal)).orElseThrow().name())
                .claim("roles", membership.getRoles().stream().map(Enum::name).toList())
                .claim("organizationId", membership.getOrganizationId())
                .claim("userId", user.getId())
                .claim("email", user.getEmail())
                .claim("sessionVersion", user.getSessionVersion())
                .setSubject(user.getName())
                .setIssuedAt(new Date(System.currentTimeMillis()))
                .setExpiration(new Date(System.currentTimeMillis() + 1000 * 60 * 60 * 10))
                .signWith(getSignKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    public Claims extractClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getSignKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    public String extractUserName(String token) {
        return extractClaims(token).getSubject();
    }

    public String extractUserId(String token) {
        return extractClaims(token).get("userId", String.class);
    }

    public String extractOrganizationId(String token) {
        return extractClaims(token).get("organizationId", String.class);
    }

    public long extractSessionVersion(String token) {
        Object version = extractClaims(token).get("sessionVersion");
        return version instanceof Number number ? number.longValue() : 0L;
    }

    public String generateOAuthState(String userId, String provider) {
        return Jwts.builder().setId(java.util.UUID.randomUUID().toString()).setSubject(userId).claim("purpose", "oauth:" + provider)
                .setIssuedAt(new Date()).setExpiration(new Date(System.currentTimeMillis() + 10 * 60 * 1000))
                .signWith(getSignKey(), SignatureAlgorithm.HS256).compact();
    }

    public String verifyOAuthState(String state, String provider) {
        Claims claims = extractClaims(state);
        if (!("oauth:" + provider).equals(claims.get("purpose", String.class))) {
            throw new IllegalArgumentException("Invalid OAuth state");
        }
        return claims.getSubject();
    }
}
