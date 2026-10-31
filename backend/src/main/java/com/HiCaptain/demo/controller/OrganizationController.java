package com.HiCaptain.demo.controller;

import com.HiCaptain.demo.model.Membership;
import com.HiCaptain.demo.model.Organization;
import com.HiCaptain.demo.repository.UserRepository;
import com.HiCaptain.demo.service.OrganizationService;
import com.HiCaptain.demo.util.Role;
import java.util.List;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/organizations")
public class OrganizationController {
    private final OrganizationService organizations;
    private final UserRepository users;
    private final AuthController auth;
    public OrganizationController(OrganizationService organizations, UserRepository users, AuthController auth) {
        this.organizations = organizations;
        this.users = users;
        this.auth = auth;
    }
    public record OrganizationView(String id, String name, Set<Role> roles) {}
    public record NameRequest(String name) {}
    public record InviteRequest(String email, Set<Role> roles, Set<String> projectIds, Role projectRole) {}
    public record RolesRequest(Set<Role> roles) {}
    public record TokenRequest(String token) {}

    @GetMapping
    public List<OrganizationView> list() {
        return organizations.membershipsFor(organizations.currentUserId()).stream().map(m -> {
            Organization org = organizations.organization(m.getOrganizationId());
            return new OrganizationView(org.getId(), org.getName(), m.getRoles());
        }).toList();
    }

    @PostMapping
    public AuthController.Session create(@RequestBody NameRequest request) {
        var user = users.findById(organizations.currentUserId()).orElseThrow();
        return auth.session(user, organizations.createOrganization(user, request.name()));
    }

    @PostMapping("/{id}/switch")
    public AuthController.Session switchTo(@PathVariable String id) {
        Membership m = organizations.membership(id, organizations.currentUserId());
        return auth.session(users.findById(m.getUserId()).orElseThrow(), m);
    }

    @GetMapping("/{id}/members")
    public List<OrganizationService.MemberView> members(@PathVariable String id) { return organizations.members(id); }

    @PostMapping("/{id}/invitations")
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager')")
    public OrganizationService.InvitationView invite(@PathVariable String id, @RequestBody InviteRequest request) {
        requireActive(id);
        return organizations.invite(id, request.email(), request.roles(), request.projectIds(), request.projectRole());
    }

    @PostMapping("/invitations/accept")
    public AuthController.Session accept(@RequestBody TokenRequest request) {
        var user = users.findById(organizations.currentUserId()).orElseThrow();
        return auth.session(user, organizations.accept(request.token(), user));
    }

    @PutMapping("/{id}/members/{userId}/roles")
    @PreAuthorize("hasAuthority('Admin')")
    public Membership roles(@PathVariable String id, @PathVariable String userId, @RequestBody RolesRequest request) {
        requireActive(id);
        return organizations.setRoles(id, userId, request.roles());
    }

    @DeleteMapping("/{id}/members/{userId}")
    @PreAuthorize("hasAuthority('Admin')")
    public void remove(@PathVariable String id, @PathVariable String userId) {
        requireActive(id);
        organizations.removeMember(id, userId);
    }

    private void requireActive(String id) {
        if (!id.equals(organizations.currentOrgId())) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Switch to this organization first");
    }
}
