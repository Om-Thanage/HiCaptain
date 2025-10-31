package com.HiCaptain.demo.service;

import com.HiCaptain.demo.model.Invoice;
import com.HiCaptain.demo.repository.InvoiceRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Optional;

@Service
public class InvoiceService {
    private final InvoiceRepository repo;

    public InvoiceService(InvoiceRepository repo) { this.repo = repo; }

    public List<Invoice> getAll() { return repo.findAll(); }

    public Optional<Invoice> getById(String id) { return repo.findById(id); }

    public Invoice create(Invoice invoice) { return repo.save(invoice); }

    public Invoice update(String id, Invoice invoice) {
        if (!repo.existsById(id)) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Invoice not found");
        invoice.setId(id);
        return repo.save(invoice);
    }

    public void delete(String id) {
        if (!repo.existsById(id)) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Invoice not found");
        repo.deleteById(id);
    }
}
