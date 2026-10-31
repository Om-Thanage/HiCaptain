package com.HiCaptain.demo.config;

import com.HiCaptain.demo.security.JwtAuthFilter;
import com.HiCaptain.demo.service.JwtService;
import com.HiCaptain.demo.service.UserService;
import com.HiCaptain.demo.service.OrganizationService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configuration.WebSecurityCustomizer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    public org.springframework.boot.web.servlet.FilterRegistrationBean<com.HiCaptain.demo.security.AuthRateLimitFilter> authenticationRateLimit(
            @org.springframework.beans.factory.annotation.Value("${AUTH_RATE_LIMIT_MAX:120}") int maximum,
            @org.springframework.beans.factory.annotation.Value("${AUTH_RATE_LIMIT_WINDOW_SECONDS:60}") int seconds) {
        var registration = new org.springframework.boot.web.servlet.FilterRegistrationBean<>(new com.HiCaptain.demo.security.AuthRateLimitFilter(maximum, seconds));
        registration.setOrder(-101);
        return registration;
    }

    @Bean
    public JwtAuthFilter jwtAuthFilter(JwtService jwtService, UserService userService, OrganizationService organizationService) {
        return new JwtAuthFilter(jwtService, userService, organizationService);
    }

    @Bean
    public WebSecurityCustomizer webSecurityCustomizer() {
        return (web) -> web.ignoring()
                .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html", "/api-docs/**");
    }
    
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http, JwtAuthFilter jwtAuthFilter) throws Exception {
        http
                .cors(org.springframework.security.config.Customizer.withDefaults())
                .csrf(c -> c.disable()) // Disable CSRF for stateless JWT
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/", "/error").permitAll() // Allow root path and error page
                        .requestMatchers("/auth/**").permitAll() // Allow registration/login
                        .requestMatchers("/api/google-calendar/auth/callback").permitAll()
                        .requestMatchers("/api/auth/github/callback").permitAll()
                        .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/github/webhook").permitAll()
                        .requestMatchers("/swagger-ui/**", "/swagger-ui.html", "/v3/api-docs/**", "/api-docs/**", "/swagger-resources/**", "/webjars/**").permitAll() // Allow Swagger UI and OpenAPI docs
                        .requestMatchers("/client/data").hasAnyAuthority("Admin", "Client") // Client + Admin access
                        .requestMatchers("/admin/data").hasAnyAuthority("Admin")  // Admin access
                        .anyRequest().authenticated() // All other requests need authentication
                )
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS)); // No sessions

        http.addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
