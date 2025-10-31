package com.HiCaptain.demo.controller;

import com.HiCaptain.demo.model.TimeLog;
import com.HiCaptain.demo.service.TimeLogService;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/timelogs")
public class TimeLogController {
    private final TimeLogService svc;

    public TimeLogController(TimeLogService svc) { this.svc = svc; }

    @GetMapping
    @PreAuthorize("hasAuthority('Admin')")
    public ResponseEntity<List<TimeLog>> getAll() {
        return ResponseEntity.ok(svc.getAll());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager','Developer')")
    public ResponseEntity<TimeLog> getById(@PathVariable String id) {
        return svc.getById(id).map(ResponseEntity::ok)
                .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND).build());
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('ProjectManager','Developer')")
    public ResponseEntity<TimeLog> create(@RequestBody TimeLog t) {
        return ResponseEntity.status(HttpStatus.CREATED).body(svc.create(t));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ProjectManager','Developer','Admin')")
    public ResponseEntity<TimeLog> update(@PathVariable String id, @RequestBody TimeLog t) {
        return ResponseEntity.ok(svc.update(id, t));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('Admin')")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        svc.delete(id);
        return ResponseEntity.noContent().build();
    }
}
