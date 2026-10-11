package com.HiCaptain.demo.service;

import com.HiCaptain.demo.model.Payment;
import com.HiCaptain.demo.repository.PaymentRepository;
import com.HiCaptain.demo.repository.InvoiceRepository;
import com.HiCaptain.demo.repository.ProjectRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Service
public class PaymentService {
    @org.springframework.beans.factory.annotation.Autowired private InvoiceService invoices;
    private final PaymentRepository repo;
    private final InvoiceRepository invoiceRepo;
    private final ProjectRepository projectRepo;

    public PaymentService(PaymentRepository repo, InvoiceRepository invoiceRepo, ProjectRepository projectRepo) {
        this.repo = repo;
        this.invoiceRepo = invoiceRepo;
        this.projectRepo = projectRepo;
    }

    public List<Payment> getAll() { return repo.findAll().stream().filter(p -> invoices.getById(p.getInvoiceId()).isPresent()).toList(); }

    public Optional<Payment> getById(String id) { return repo.findById(id).filter(p -> invoices.getById(p.getInvoiceId()).isPresent()); }

    public Payment create(Payment p) {
        requireInvoice(p.getInvoiceId());
        p.setId(null);
        Payment saved = repo.save(p);
        // Maintain invoice.paymentIds
        if (saved.getInvoiceId() != null) {
            invoiceRepo.findById(saved.getInvoiceId()).ifPresent(inv -> {
                List<String> ids = inv.getPaymentIds();
                if (ids == null) ids = new ArrayList<>();
                if (!ids.contains(saved.getId())) {
                    ids.add(saved.getId());
                    inv.setPaymentIds(ids);
                    invoiceRepo.save(inv);
                }
                // Maintain project.paymentIds via invoice.projectId
                if (inv.getProjectId() != null) {
                    projectRepo.findById(inv.getProjectId()).ifPresent(pj -> {
                        List<String> pids = pj.getPaymentIds();
                        if (pids == null) pids = new ArrayList<>();
                        if (!pids.contains(saved.getId())) {
                            pids.add(saved.getId());
                            pj.setPaymentIds(pids);
                            projectRepo.save(pj);
                        }
                    });
                }
            });
        }
        return saved;
    }

    public Payment update(String id, Payment p) {
        Payment existing = getById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Payment not found"));

        String oldInvoiceId = existing.getInvoiceId();
        String newInvoiceId = p.getInvoiceId();
        requireInvoice(newInvoiceId);

        p.setId(id);
        Payment saved = repo.save(p);

        if (!Objects.equals(oldInvoiceId, newInvoiceId)) {
            // Remove from old invoice and its project
            if (oldInvoiceId != null) {
                invoiceRepo.findById(oldInvoiceId).ifPresent(inv -> {
                    List<String> ids = inv.getPaymentIds();
                    if (ids != null && ids.remove(id)) {
                        inv.setPaymentIds(ids);
                        invoiceRepo.save(inv);
                    }
                    if (inv.getProjectId() != null) {
                        projectRepo.findById(inv.getProjectId()).ifPresent(pj -> {
                            List<String> pids = pj.getPaymentIds();
                            if (pids != null && pids.remove(id)) {
                                pj.setPaymentIds(pids);
                                projectRepo.save(pj);
                            }
                        });
                    }
                });
            }
            // Add to new invoice and its project
            if (newInvoiceId != null) {
                invoiceRepo.findById(newInvoiceId).ifPresent(inv -> {
                    List<String> ids = inv.getPaymentIds();
                    if (ids == null) ids = new ArrayList<>();
                    if (!ids.contains(id)) {
                        ids.add(id);
                        inv.setPaymentIds(ids);
                        invoiceRepo.save(inv);
                    }
                    if (inv.getProjectId() != null) {
                        projectRepo.findById(inv.getProjectId()).ifPresent(pj -> {
                            List<String> pids = pj.getPaymentIds();
                            if (pids == null) pids = new ArrayList<>();
                            if (!pids.contains(id)) {
                                pids.add(id);
                                pj.setPaymentIds(pids);
                                projectRepo.save(pj);
                            }
                        });
                    }
                });
            }
        }

        return saved;
    }

    public void delete(String id) {
        Payment existing = getById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Payment not found"));

        repo.deleteById(id);

        if (existing.getInvoiceId() != null) {
            invoiceRepo.findById(existing.getInvoiceId()).ifPresent(inv -> {
                List<String> ids = inv.getPaymentIds();
                if (ids != null && ids.remove(id)) {
                    inv.setPaymentIds(ids);
                    invoiceRepo.save(inv);
                }
                if (inv.getProjectId() != null) {
                    projectRepo.findById(inv.getProjectId()).ifPresent(pj -> {
                        List<String> pids = pj.getPaymentIds();
                        if (pids != null && pids.remove(id)) {
                            pj.setPaymentIds(pids);
                            projectRepo.save(pj);
                        }
                    });
                }
            });
        }
    }

    private void requireInvoice(String id) {
        invoices.getById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Invoice not found"));
    }
}
