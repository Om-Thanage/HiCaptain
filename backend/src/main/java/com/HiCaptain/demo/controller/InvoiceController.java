package com.HiCaptain.demo.controller;

import com.HiCaptain.demo.model.Invoice;
import com.HiCaptain.demo.service.InvoiceService;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/invoices")
public class InvoiceController {
    private final InvoiceService svc;

    public InvoiceController(InvoiceService svc) { this.svc = svc; }

    @GetMapping
    @PreAuthorize("hasAuthority('Admin')")
    public ResponseEntity<List<Invoice>> getAll() {
        return ResponseEntity.ok(svc.getAll());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('Admin','Client')")
    public ResponseEntity<Invoice> getById(@PathVariable String id) {
        return svc.getById(id).map(ResponseEntity::ok)
                .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND).build());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('Admin')")
    public ResponseEntity<Invoice> create(@RequestBody Invoice i) {
        return ResponseEntity.status(HttpStatus.CREATED).body(svc.create(i));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('Admin')")
    public ResponseEntity<Invoice> update(@PathVariable String id, @RequestBody Invoice i) {
        return ResponseEntity.ok(svc.update(id, i));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('Admin')")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        svc.delete(id);
        return ResponseEntity.noContent().build();
    }
}
