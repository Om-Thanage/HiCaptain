package com.HiCaptain.demo.controller;

import com.HiCaptain.demo.model.Membership;
import com.HiCaptain.demo.model.User;
import com.HiCaptain.demo.repository.UserRepository;
import com.HiCaptain.demo.service.JwtService;
import com.HiCaptain.demo.service.OrganizationService;
import com.HiCaptain.demo.util.Usernames;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.Comparator;
import java.util.Locale;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/auth")
public class AuthController {
    private final UserRepository users;
    private final OrganizationService organizations;
    private final JwtService jwt;
    private final PasswordEncoder passwords;

    public AuthController(UserRepository users, OrganizationService organizations, JwtService jwt, PasswordEncoder passwords) {
        this.users = users;
        this.organizations = organizations;
        this.jwt = jwt;
        this.passwords = passwords;
    }

    public record Registration(@Email @NotBlank String email,
            @Size(min = 8) @NotBlank String password, @NotBlank String organizationName) {}
    public record InvitedRegistration(@Email @NotBlank String email,
            @Size(min = 8) @NotBlank String password, @NotBlank String token) {}
    public record Login(@Email @NotBlank String email, @NotBlank String password) {}
    public record Session(String token, String userId, String name, String email, String role,
            String organizationId, java.util.Set<com.HiCaptain.demo.util.Role> roles) {}

    @PostMapping("/register")
    public Session register(@Valid @RequestBody Registration request) {
        User user = createUser(request.email(), request.password());
        Membership membership;
        try {
            membership = organizations.createOrganization(user, request.organizationName());
        } catch (RuntimeException failure) {
            users.deleteById(user.getId());
            throw failure;
        }
        return session(user, membership);
    }

    @PostMapping("/invitations/register")
    public Session registerInvited(@Valid @RequestBody InvitedRegistration request) {
        var invitation = organizations.preview(request.token());
        if (!invitation.email().equalsIgnoreCase(request.email())) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invitation email does not match");
        User user = createUser(request.email(), request.password());
        Membership membership;
        try {
            membership = organizations.accept(request.token(), user);
        } catch (RuntimeException failure) {
            users.deleteById(user.getId());
            throw failure;
        }
        return session(user, membership);
    }

    @GetMapping("/invitations/preview")
    public OrganizationService.InvitationView preview(@RequestParam String token) {
        return organizations.preview(token);
    }

    @PostMapping("/login")
    public Session login(@Valid @RequestBody Login request) {
        User user = users.findByEmailIgnoreCase(request.email().trim().toLowerCase(Locale.ROOT))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));
        if (!passwords.matches(request.password(), user.getPassword())) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        Membership membership = organizations.membershipsFor(user.getId()).stream()
                .sorted(Comparator.comparing(Membership::getOrganizationId)).findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Account has no organization"));
        return session(user, membership);
    }

    private User createUser(String email, String password) {
        email = email.trim().toLowerCase(Locale.ROOT);
        if (users.existsByEmailIgnoreCase(email)) throw new ResponseStatusException(HttpStatus.CONFLICT, "An account with this email already exists");
        User user = new User();
        user.setName(Usernames.generate(email));
        user.setEmail(email);
        user.setPassword(passwords.encode(password));
        try {
            return users.save(user);
        } catch (org.springframework.dao.DuplicateKeyException duplicate) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "An account with this email already exists");
        }
    }

    public Session session(User user, Membership membership) {
        String role = membership.getRoles().stream().min(java.util.Comparator.comparingInt(Enum::ordinal)).orElseThrow().name();
        return new Session(jwt.generateToken(user, membership), user.getId(), user.getName(), user.getEmail(), role,
                membership.getOrganizationId(), membership.getRoles());
    }
}
