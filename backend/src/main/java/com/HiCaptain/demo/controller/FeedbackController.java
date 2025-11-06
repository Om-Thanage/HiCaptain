package com.HiCaptain.demo.controller;

import com.HiCaptain.demo.model.Feedback;
import com.HiCaptain.demo.service.FeedbackService;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/feedback")
public class FeedbackController {
    private final FeedbackService svc;

    public FeedbackController(FeedbackService svc) { this.svc = svc; }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('Admin','Client','ProjectManager')")
    public ResponseEntity<List<Feedback>> getAll() {
        return ResponseEntity.ok(svc.getAll());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('Admin','Client')")
    public ResponseEntity<Feedback> getById(@PathVariable String id) {
        return svc.getById(id).map(ResponseEntity::ok)
                .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND).build());
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('Client','Developer')")
    public ResponseEntity<Feedback> create(@RequestBody Feedback f) {
        return ResponseEntity.status(HttpStatus.CREATED).body(svc.create(f));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('Admin')")
    public ResponseEntity<Feedback> update(@PathVariable String id, @RequestBody Feedback f) {
        return ResponseEntity.ok(svc.update(id, f));
    }

    @GetMapping("/project/{projectId}")
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager','Client')")
    public ResponseEntity<List<Feedback>> getByProjectId(@PathVariable String projectId) {
        List<Feedback> feedbacks = svc.getAll().stream()
            .filter(feedback -> projectId.equals(feedback.getProjectId()))
            .toList();
        return ResponseEntity.ok(feedbacks);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager')")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        svc.delete(id);
        return ResponseEntity.noContent().build();
    }
}
