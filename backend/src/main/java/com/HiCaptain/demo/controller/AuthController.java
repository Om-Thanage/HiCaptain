package com.HiCaptain.demo.controller;

import com.HiCaptain.demo.dto.AuthRequest;
import com.HiCaptain.demo.dto.AuthResponse;
import com.HiCaptain.demo.dto.ErrorResponse;
import com.HiCaptain.demo.model.User;
import com.HiCaptain.demo.service.JwtService;
import com.HiCaptain.demo.service.UserService;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@Slf4j
@RestController
@RequestMapping("/auth")
@CrossOrigin(origins = "http://localhost:3000")
public class AuthController {
    @Autowired private UserService userService;
    @Autowired private JwtService jwtService;
    @Autowired private PasswordEncoder passwordEncoder;

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody User user) {
        log.debug("Registration attempt for email: {}", user.getEmail());
        User savedUser = userService.save(user);
        log.info("User registered successfully: {} (ID: {})", savedUser.getEmail(), savedUser.getId());
        return ResponseEntity.ok(savedUser);
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody AuthRequest request, jakarta.servlet.http.HttpServletRequest servletRequest) {
        log.debug("Login attempt for email: {}", request.getEmail());
        Optional<User> user = userService.findByEmail(request.getEmail());
        if (user.isPresent() && passwordEncoder.matches(request.getPassword(), user.get().getPassword())) {
            String token = jwtService.generateToken(user.get());
            log.info("User logged in successfully: {} (ID: {})", user.get().getEmail(), user.get().getId());

            return ResponseEntity.ok(new AuthResponse(
                token,
                user.get().getId(),
                user.get().getName(),
                user.get().getEmail(),
                user.get().getRole().name()
            ));
        }

        log.warn("Login failed for email: {} - Invalid credentials", request.getEmail());
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
            .body(new ErrorResponse(
                HttpStatus.UNAUTHORIZED.value(),
                "Invalid credentials",
                "Authentication failed",
                servletRequest.getRequestURI()
            ));
    }
}

