package com.HiCaptain.demo.service;

import com.HiCaptain.demo.model.Meeting;
import com.HiCaptain.demo.repository.MeetingRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Optional;

@Service
public class MeetingService {
    private final MeetingRepository repo;

    public MeetingService(MeetingRepository repo) { this.repo = repo; }

    public List<Meeting> getAll() { return repo.findAll(); }

    public Optional<Meeting> getById(String id) { return repo.findById(id); }

    public Meeting create(Meeting m) { return repo.save(m); }

    public Meeting update(String id, Meeting m) {
        if (!repo.existsById(id)) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Meeting not found");
        m.setId(id);
        return repo.save(m);
    }

    public void delete(String id) {
        if (!repo.existsById(id)) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Meeting not found");
        repo.deleteById(id);
    }
}
