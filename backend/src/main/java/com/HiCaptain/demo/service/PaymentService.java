package com.HiCaptain.demo.service;

import com.HiCaptain.demo.model.Payment;
import com.HiCaptain.demo.repository.PaymentRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Optional;

@Service
public class PaymentService {
    private final PaymentRepository repo;

    public PaymentService(PaymentRepository repo) { this.repo = repo; }

    public List<Payment> getAll() { return repo.findAll(); }

    public Optional<Payment> getById(String id) { return repo.findById(id); }

    public Payment create(Payment p) { return repo.save(p); }

    public Payment update(String id, Payment p) {
        if (!repo.existsById(id)) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Payment not found");
        p.setId(id);
        return repo.save(p);
    }

    public void delete(String id) {
        if (!repo.existsById(id)) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Payment not found");
        repo.deleteById(id);
    }
}
