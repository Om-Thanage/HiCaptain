package com.HiCaptain.demo.controller;

import com.HiCaptain.demo.model.Project;
import com.HiCaptain.demo.model.User;
import com.HiCaptain.demo.service.ProjectService;
import com.HiCaptain.demo.repository.UserRepository;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/projects")
@CrossOrigin(origins = "http://localhost:3000")
public class ProjectController {

    private final ProjectService svc;
    private final UserRepository userRepo;

    public ProjectController(ProjectService svc, UserRepository userRepo) {
        this.svc = svc;
        this.userRepo = userRepo;
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager','Client','Developer')")
    public ResponseEntity<List<Project>> getAll() {
        log.debug("Fetching all projects");
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        // Now auth.getName() returns the userId directly from JWT token
        String userId = auth.getName();
        String role = auth.getAuthorities().iterator().next().getAuthority();
        log.debug("User {} with role {} requesting all projects", userId, role);

        List<Project> all = svc.getAll();
        if ("Admin".equals(role)) {
            log.info("Admin user {} retrieved {} projects", userId, all.size());
            return ResponseEntity.ok(all);
        }

        List<Project> filtered = all.stream().filter(p -> {
            if (p == null) return false;
            return switch (role) {
                case "ProjectManager" -> userId.equals(p.getProjectManagerId());
                case "Developer" -> p.getDeveloperIds() != null && p.getDeveloperIds().contains(userId);
                case "Client" -> userId.equals(p.getClientId());
                default -> false;
            };
        }).toList();

        log.info("User {} with role {} retrieved {} filtered projects", userId, role, filtered.size());
        return ResponseEntity.ok(filtered);
    }

    @GetMapping("/my")
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager','Client','Developer')")
    public ResponseEntity<List<Project>> getMyProjects() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String userId = auth.getName();
        String role = auth.getAuthorities().iterator().next().getAuthority();

        List<Project> all = svc.getAll();
        if ("Admin".equals(role)) {
            return ResponseEntity.ok(all);
        }

        List<Project> filtered = all.stream().filter(p -> {
            if (p == null) return false;
            return ("ProjectManager".equals(role) && userId.equals(p.getProjectManagerId())) ||
                   ("Developer".equals(role) && p.getDeveloperIds() != null && p.getDeveloperIds().contains(userId)) ||
                   ("Client".equals(role) && userId.equals(p.getClientId()));
        }).toList();

        return ResponseEntity.ok(filtered);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager','Client','Developer')")
    public ResponseEntity<Project> getById(@PathVariable String id) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String userId = auth.getName();
        String role = auth.getAuthorities().iterator().next().getAuthority();

        return svc.getById(id)
                .map(p -> {
                    if ("Admin".equals(role)) {
                        return ResponseEntity.ok(p);
                    }
                    boolean allowed =
                            ("ProjectManager".equals(role) && userId.equals(p.getProjectManagerId())) ||
                            ("Developer".equals(role) && p.getDeveloperIds() != null && p.getDeveloperIds().contains(userId)) ||
                            ("Client".equals(role) && userId.equals(p.getClientId()));
                    return allowed ? ResponseEntity.ok(p) : new ResponseEntity<Project>(HttpStatus.FORBIDDEN);
                })
                .orElseGet(() -> new ResponseEntity<>(HttpStatus.NOT_FOUND));
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager')")
    public ResponseEntity<Project> create(@Valid @RequestBody Project p) {
        log.debug("Creating new project: {}", p.getName());
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String currentUserId = auth.getName();
        String currentUserRole = auth.getAuthorities().iterator().next().getAuthority();

        // If a Project Manager is creating and projectManagerId is not set, auto-assign to self
        if ("ProjectManager".equals(currentUserRole) && (p.getProjectManagerId() == null || p.getProjectManagerId().isBlank())) {
            p.setProjectManagerId(currentUserId);
        }

        // Set createdBy as "<Role> : <username>"
        String username = userRepo.findById(currentUserId)
                .map(User::getName)
                .orElse(currentUserId);
        p.setCreatedBy(currentUserRole + " : " + username);

        Project created = svc.create(p);
        log.info("Project created successfully: {} (ID: {}) by {}", created.getName(), created.getId(), username);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PostMapping("/{projectId}/developers/{developerId}")
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager')")
    public ResponseEntity<Project> addDeveloperToProject(@PathVariable String projectId, @PathVariable String developerId) {
        Project updated = svc.addDeveloper(projectId, developerId);
        return ResponseEntity.ok(updated);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager')")
    public ResponseEntity<Project> update(@PathVariable String id, @Valid @RequestBody Project p) {
        return ResponseEntity.ok(svc.update(id, p));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager')")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        svc.delete(id);
        return ResponseEntity.noContent().build();
    }
}
