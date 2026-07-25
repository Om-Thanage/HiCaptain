package com.HiCaptain.demo.controller;

import com.HiCaptain.demo.model.Task;
import com.HiCaptain.demo.service.TaskService;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/tasks")
@CrossOrigin(origins = "http://localhost:3000")
public class TaskController {

    private final TaskService svc;

    public TaskController(TaskService svc) {
        this.svc = svc;
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager')")
    public ResponseEntity<List<Task>> getAll() {
        return ResponseEntity.ok(svc.getAll());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager','Developer')")
    public ResponseEntity<Task> getById(@PathVariable String id) {
        return svc.getById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND).build());
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager')")
    public ResponseEntity<Task> create(@Valid @RequestBody Task t) {
        log.debug("Creating new task: {} for project: {}", t.getTitle(), t.getProjectId());
        Task created = svc.create(t);
        log.info("Task created successfully: {} (ID: {})", created.getTitle(), created.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager','Developer')")
    public ResponseEntity<Task> update(@PathVariable String id, @Valid @RequestBody Task t) {
        return ResponseEntity.ok(svc.update(id, t));
    }

    @GetMapping("/project/{projectId}")
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager','Developer','Client')")
    public ResponseEntity<List<Task>> getByProjectId(@PathVariable String projectId) {
        log.debug("Getting tasks for project: {}", projectId);
        List<Task> allTasks = svc.getAll();
        log.debug("Total tasks in database: {}", allTasks.size());
        
        List<Task> tasks = allTasks.stream()
            .filter(task -> {
                boolean matches = projectId.equals(task.getProjectId());
                if (matches) {
                    log.trace("Found matching task: {} - {}", task.getId(), task.getTitle());
                }
                return matches;
            })
            .toList();
            
        log.info("Filtered tasks for project {}: {} tasks found", projectId, tasks.size());
        return ResponseEntity.ok(tasks);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager')")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        svc.delete(id);
        return ResponseEntity.noContent().build();
    }
}
