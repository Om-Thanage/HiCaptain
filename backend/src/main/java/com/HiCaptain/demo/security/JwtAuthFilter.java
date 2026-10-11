package com.HiCaptain.demo.security;

import com.HiCaptain.demo.service.JwtService;
import com.HiCaptain.demo.service.UserService;
import com.HiCaptain.demo.service.OrganizationService;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.stream.Collectors;

@Component 
public class JwtAuthFilter extends OncePerRequestFilter {
    private final JwtService jwtService;
    private final UserService userService;
    private final OrganizationService organizationService;

    public JwtAuthFilter(JwtService jwtService, UserService userService, OrganizationService organizationService) {
        this.jwtService = jwtService;
        this.userService = userService;
        this.organizationService = organizationService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");

        String servletPath = request.getServletPath();
        if (servletPath != null && servletPath.startsWith("/auth/")) {
            filterChain.doFilter(request, response);
            return;
        }

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            try {
                String username = jwtService.extractUserName(token);
                String userId = jwtService.extractUserId(token);
                String organizationId = jwtService.extractOrganizationId(token);

                if (username != null && userId != null && organizationId != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                    var membership = organizationService.membership(organizationId, userId);
                    if (userService.getById(userId).isEmpty()) throw new IllegalArgumentException("User no longer exists");
                    // Create a custom UserDetails that includes the userId
                    UserDetails userDetails = new org.springframework.security.core.userdetails.User(
                            userId, // Use userId as the principal instead of username
                            "",
                            membership.getRoles().stream().map(role -> new SimpleGrantedAuthority(role.name())).collect(Collectors.toSet())
                    );

                    UsernamePasswordAuthenticationToken authToken =
                            new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
                    authToken.setDetails(organizationId);
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                }
            } catch (JwtException | IllegalArgumentException | org.springframework.web.server.ResponseStatusException ex) {
                // Invalid or expired token - return 401 Unauthorized
                SecurityContextHolder.clearContext();
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                response.setContentType("application/json");
                response.getWriter().write("{\"error\":\"Invalid or expired token\"}");
                return;
            }
        }

        filterChain.doFilter(request, response);
    }
}
