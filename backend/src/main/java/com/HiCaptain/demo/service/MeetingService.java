package com.HiCaptain.demo.service;

import com.HiCaptain.demo.model.Meeting;
import com.HiCaptain.demo.repository.MeetingRepository;
import com.HiCaptain.demo.repository.ProjectRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Service
public class MeetingService {
    private final MeetingRepository repo;
    private final ProjectRepository projectRepo;

    public MeetingService(MeetingRepository repo, ProjectRepository projectRepo) {
        this.repo = repo;
        this.projectRepo = projectRepo;
    }

    public List<Meeting> getAll() { return repo.findAll(); }

    public Optional<Meeting> getById(String id) { return repo.findById(id); }

    public Meeting create(Meeting m) {
        Meeting saved = repo.save(m);
        if (saved.getProjectId() != null) {
            projectRepo.findById(saved.getProjectId()).ifPresent(p -> {
                List<String> ids = p.getMeetingIds();
                if (ids == null) ids = new ArrayList<>();
                if (!ids.contains(saved.getId())) {
                    ids.add(saved.getId());
                    p.setMeetingIds(ids);
                    projectRepo.save(p);
                }
            });
        }
        return saved;
    }

    public Meeting update(String id, Meeting m) {
        Meeting existing = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Meeting not found"));

        String oldProjectId = existing.getProjectId();
        String newProjectId = m.getProjectId();

        m.setId(id);
        Meeting saved = repo.save(m);

        if (!Objects.equals(oldProjectId, newProjectId)) {
            if (oldProjectId != null) {
                projectRepo.findById(oldProjectId).ifPresent(p -> {
                    List<String> ids = p.getMeetingIds();
                    if (ids != null && ids.remove(id)) {
                        p.setMeetingIds(ids);
                        projectRepo.save(p);
                    }
                });
            }
        }
        if (newProjectId != null) {
            projectRepo.findById(newProjectId).ifPresent(p -> {
                List<String> ids = p.getMeetingIds();
                if (ids == null) ids = new ArrayList<>();
                if (!ids.contains(id)) {
                    ids.add(id);
                    p.setMeetingIds(ids);
                    projectRepo.save(p);
                }
            });
        }

        return saved;
    }

    public void delete(String id) {
        Meeting existing = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Meeting not found"));

        repo.deleteById(id);

        if (existing.getProjectId() != null) {
            projectRepo.findById(existing.getProjectId()).ifPresent(p -> {
                List<String> ids = p.getMeetingIds();
                if (ids != null && ids.remove(id)) {
                    p.setMeetingIds(ids);
                    projectRepo.save(p);
                }
            });
        }
    }
}
