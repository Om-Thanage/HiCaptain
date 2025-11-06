package com.HiCaptain.demo.controller;

import com.HiCaptain.demo.model.Invoice;
import com.HiCaptain.demo.service.InvoiceService;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/invoices")
@CrossOrigin(origins = "http://localhost:3000")
public class InvoiceController {
    private final InvoiceService svc;

    public InvoiceController(InvoiceService svc) { this.svc = svc; }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager','Client')")
    public ResponseEntity<List<Invoice>> getAll() {
        return ResponseEntity.ok(svc.getAll());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('Admin','Client')")
    public ResponseEntity<Invoice> getById(@PathVariable String id) {
        return svc.getById(id).map(ResponseEntity::ok)
                .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND).build());
    }

    @GetMapping("/project/{projectId}")
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager','Client')")
    public ResponseEntity<List<Invoice>> getByProjectId(@PathVariable String projectId) {
        List<Invoice> invoices = svc.getAll().stream()
            .filter(invoice -> projectId.equals(invoice.getProjectId()))
            .toList();
        return ResponseEntity.ok(invoices);
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager')")
    public ResponseEntity<Invoice> create(@RequestBody Invoice i) {
        return ResponseEntity.status(HttpStatus.CREATED).body(svc.create(i));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager','Client')")
    public ResponseEntity<Invoice> update(@PathVariable String id, @RequestBody Invoice i) {
        return ResponseEntity.ok(svc.update(id, i));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager')")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        svc.delete(id);
        return ResponseEntity.noContent().build();
    }
}
