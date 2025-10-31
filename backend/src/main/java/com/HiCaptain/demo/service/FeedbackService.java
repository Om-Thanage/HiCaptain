package com.HiCaptain.demo.service;

import com.HiCaptain.demo.model.Feedback;
import com.HiCaptain.demo.repository.FeedbackRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Optional;

@Service
public class FeedbackService {
    private final FeedbackRepository repo;

    public FeedbackService(FeedbackRepository repo) { this.repo = repo; }

    public List<Feedback> getAll() { return repo.findAll(); }

    public Optional<Feedback> getById(String id) { return repo.findById(id); }

    public Feedback create(Feedback f) { return repo.save(f); }

    public Feedback update(String id, Feedback f) {
        if (!repo.existsById(id)) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Feedback not found");
        f.setId(id);
        return repo.save(f);
    }

    public void delete(String id) {
        if (!repo.existsById(id)) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Feedback not found");
        repo.deleteById(id);
    }
}
