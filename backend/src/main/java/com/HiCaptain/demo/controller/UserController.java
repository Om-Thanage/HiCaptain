package com.HiCaptain.demo.controller;

import com.HiCaptain.demo.repository.UserRepository;
import com.HiCaptain.demo.service.OrganizationService;
import com.HiCaptain.demo.util.Role;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/users")
public class UserController {
    private final OrganizationService organizations;
    private final UserRepository users;
    private final AuthController auth;
    public UserController(OrganizationService organizations, UserRepository users, AuthController auth) {
        this.organizations = organizations;
        this.users = users;
        this.auth = auth;
    }

    public record ProfileRequest(@NotBlank @Size(max = 80) String name) {}

    @PatchMapping("/me/profile")
    public AuthController.Session updateProfile(@Valid @RequestBody ProfileRequest request) {
        String userId = organizations.currentUserId();
        var user = users.findById(userId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        user.setName(request.name().trim());
        user = users.save(user);
        return auth.session(user, organizations.membership(organizations.currentOrgId(), userId));
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager','Client','Developer')")
    public List<OrganizationService.MemberView> getAll(@RequestParam(required = false) Role role) {
        return organizations.members(organizations.currentOrgId()).stream()
                .filter(member -> role == null || member.roles().contains(role)).toList();
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('Admin')")
    public OrganizationService.MemberView getById(@PathVariable String id) {
        return getAll(null).stream().filter(member -> member.id().equals(id)).findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }
}
