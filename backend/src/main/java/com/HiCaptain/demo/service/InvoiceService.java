package com.HiCaptain.demo.service;

import com.HiCaptain.demo.model.Invoice;
import com.HiCaptain.demo.repository.InvoiceRepository;
import com.HiCaptain.demo.repository.PaymentRepository;
import com.HiCaptain.demo.repository.ProjectRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Service
public class InvoiceService {
    private final InvoiceRepository repo;
    private final PaymentRepository paymentRepo;
    private final ProjectRepository projectRepo;

    public InvoiceService(InvoiceRepository repo, PaymentRepository paymentRepo, ProjectRepository projectRepo) {
        this.repo = repo;
        this.paymentRepo = paymentRepo;
        this.projectRepo = projectRepo;
    }

    public List<Invoice> getAll() { return repo.findAll(); }

    public Optional<Invoice> getById(String id) { return repo.findById(id); }

    public Invoice create(Invoice invoice) {
        Invoice saved = repo.save(invoice);
        if (saved.getProjectId() != null) {
            projectRepo.findById(saved.getProjectId()).ifPresent(p -> {
                List<String> ids = p.getInvoiceIds();
                if (ids == null) ids = new ArrayList<>();
                if (!ids.contains(saved.getId())) {
                    ids.add(saved.getId());
                    p.setInvoiceIds(ids);
                    projectRepo.save(p);
                }
            });
        }
        return saved;
    }

    public Invoice update(String id, Invoice invoice) {
        Invoice existing = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Invoice not found"));

        String oldProjectId = existing.getProjectId();
        String newProjectId = invoice.getProjectId();

        invoice.setId(id);
        Invoice saved = repo.save(invoice);

        if (!Objects.equals(oldProjectId, newProjectId)) {
            if (oldProjectId != null) {
                projectRepo.findById(oldProjectId).ifPresent(p -> {
                    List<String> ids = p.getInvoiceIds();
                    if (ids != null && ids.remove(id)) {
                        p.setInvoiceIds(ids);
                        projectRepo.save(p);
                    }
                });
            }
        }
        if (newProjectId != null) {
            projectRepo.findById(newProjectId).ifPresent(p -> {
                List<String> ids = p.getInvoiceIds();
                if (ids == null) ids = new ArrayList<>();
                if (!ids.contains(id)) {
                    ids.add(id);
                    p.setInvoiceIds(ids);
                    projectRepo.save(p);
                }
            });
        }

        return saved;
    }

    public void delete(String id) {
        Optional<Invoice> invOpt = repo.findById(id);
        if (invOpt.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Invoice not found");

        Invoice inv = invOpt.get();

        // Remove invoice id from project
        if (inv.getProjectId() != null) {
            projectRepo.findById(inv.getProjectId()).ifPresent(p -> {
                // Remove invoice id
                List<String> invIds = p.getInvoiceIds();
                if (invIds != null && invIds.remove(inv.getId())) p.setInvoiceIds(invIds);

                // Remove all related payment ids from project
                if (inv.getPaymentIds() != null && !inv.getPaymentIds().isEmpty()) {
                    List<String> payIds = p.getPaymentIds();
                    if (payIds != null && payIds.removeAll(inv.getPaymentIds())) {
                        p.setPaymentIds(payIds);
                    }
                }
                projectRepo.save(p);
            });
        }

        // Cascade delete payments
        if (inv.getPaymentIds() != null && !inv.getPaymentIds().isEmpty()) {
            paymentRepo.deleteAllById(inv.getPaymentIds());
        }
        repo.deleteById(id);
    }
}
