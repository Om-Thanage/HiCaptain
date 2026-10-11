package com.HiCaptain.demo.controller;

import com.HiCaptain.demo.service.OrganizationService;
import com.HiCaptain.demo.util.Role;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/users")
public class UserController {
    private final OrganizationService organizations;
    public UserController(OrganizationService organizations) { this.organizations = organizations; }

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
