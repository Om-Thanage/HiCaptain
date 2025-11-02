package com.HiCaptain.demo.controller;

import com.HiCaptain.demo.model.User;
import com.HiCaptain.demo.service.UserService;
import com.HiCaptain.demo.util.Role;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/users")
@CrossOrigin(origins = "http://localhost:3000")
public class UserController {
    private final UserService svc;

    public UserController(UserService svc) { this.svc = svc; }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager')")
    public ResponseEntity<List<User>> getAll(@RequestParam(value = "role", required = false) String role) {
        if (role == null || role.isBlank()) {
            return ResponseEntity.ok(svc.getAll());
        }
        try {
            Role r = Role.valueOf(role);
            return ResponseEntity.ok(svc.getByRole(r));
        } catch (IllegalArgumentException ex) {
            // If invalid role is provided, return 400
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('Admin')")
    public ResponseEntity<User> getById(@PathVariable String id) {
        return svc.getById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND).build());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('Admin')")
    public ResponseEntity<User> create(@RequestBody User user) {
        User created = svc.create(user);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('Admin')")
    public ResponseEntity<User> update(@PathVariable String id, @RequestBody User user) {
        return ResponseEntity.ok(svc.update(id, user));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('Admin')")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        svc.delete(id);
        return ResponseEntity.noContent().build();
    }
}
