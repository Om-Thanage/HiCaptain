package com.HiCaptain.demo.controller;

import com.HiCaptain.demo.model.Task;
import com.HiCaptain.demo.service.TaskService;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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
    public ResponseEntity<Task> create(@RequestBody Task t) {
        return ResponseEntity.status(HttpStatus.CREATED).body(svc.create(t));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager','Developer')")
    public ResponseEntity<Task> update(@PathVariable String id, @RequestBody Task t) {
        return ResponseEntity.ok(svc.update(id, t));
    }

    @GetMapping("/project/{projectId}")
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager','Developer','Client')")
    public ResponseEntity<List<Task>> getByProjectId(@PathVariable String projectId) {
        System.out.println("Getting tasks for project: " + projectId);
        List<Task> allTasks = svc.getAll();
        System.out.println("Total tasks in database: " + allTasks.size());
        
        List<Task> tasks = allTasks.stream()
            .filter(task -> {
                boolean matches = projectId.equals(task.getProjectId());
                if (matches) {
                    System.out.println("Found matching task: " + task.getId() + " - " + task.getTitle());
                }
                return matches;
            })
            .toList();
            
        System.out.println("Filtered tasks for project " + projectId + ": " + tasks.size());
        return ResponseEntity.ok(tasks);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager')")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        svc.delete(id);
        return ResponseEntity.noContent().build();
    }
}
