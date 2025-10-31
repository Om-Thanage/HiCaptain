package com.HiCaptain.demo.service;

import com.HiCaptain.demo.model.TimeLog;
import com.HiCaptain.demo.repository.TimeLogRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Optional;

@Service
public class TimeLogService {
    private final TimeLogRepository repo;

    public TimeLogService(TimeLogRepository repo) { this.repo = repo; }

    public List<TimeLog> getAll() { return repo.findAll(); }

    public Optional<TimeLog> getById(String id) { return repo.findById(id); }

    public TimeLog create(TimeLog t) { return repo.save(t); }

    public TimeLog update(String id, TimeLog t) {
        if (!repo.existsById(id)) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "TimeLog not found");
        t.setId(id);
        return repo.save(t);
    }

    public void delete(String id) {
        if (!repo.existsById(id)) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "TimeLog not found");
        repo.deleteById(id);
    }
}
