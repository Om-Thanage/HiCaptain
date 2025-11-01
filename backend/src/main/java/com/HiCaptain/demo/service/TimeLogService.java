package com.HiCaptain.demo.service;

import com.HiCaptain.demo.model.TimeLog;
import com.HiCaptain.demo.repository.TimeLogRepository;
import com.HiCaptain.demo.repository.ProjectRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Service
public class TimeLogService {
    private final TimeLogRepository repo;
    private final ProjectRepository projectRepo;

    public TimeLogService(TimeLogRepository repo, ProjectRepository projectRepo) {
        this.repo = repo;
        this.projectRepo = projectRepo;
    }

    public List<TimeLog> getAll() { return repo.findAll(); }

    public Optional<TimeLog> getById(String id) { return repo.findById(id); }

    public TimeLog create(TimeLog t) {
        TimeLog saved = repo.save(t);
        if (saved.getProjectId() != null) {
            projectRepo.findById(saved.getProjectId()).ifPresent(p -> {
                List<String> ids = p.getTimeLogIds();
                if (ids == null) ids = new ArrayList<>();
                if (!ids.contains(saved.getId())) {
                    ids.add(saved.getId());
                    p.setTimeLogIds(ids);
                    projectRepo.save(p);
                }
            });
        }
        return saved;
    }

    public TimeLog update(String id, TimeLog t) {
        TimeLog existing = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "TimeLog not found"));

        String oldProjectId = existing.getProjectId();
        String newProjectId = t.getProjectId();

        t.setId(id);
        TimeLog saved = repo.save(t);

        if (!Objects.equals(oldProjectId, newProjectId)) {
            if (oldProjectId != null) {
                projectRepo.findById(oldProjectId).ifPresent(p -> {
                    List<String> ids = p.getTimeLogIds();
                    if (ids != null && ids.remove(id)) {
                        p.setTimeLogIds(ids);
                        projectRepo.save(p);
                    }
                });
            }
        }
        if (newProjectId != null) {
            projectRepo.findById(newProjectId).ifPresent(p -> {
                List<String> ids = p.getTimeLogIds();
                if (ids == null) ids = new ArrayList<>();
                if (!ids.contains(id)) {
                    ids.add(id);
                    p.setTimeLogIds(ids);
                    projectRepo.save(p);
                }
            });
        }

        return saved;
    }

    public void delete(String id) {
        TimeLog existing = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "TimeLog not found"));

        repo.deleteById(id);

        if (existing.getProjectId() != null) {
            projectRepo.findById(existing.getProjectId()).ifPresent(p -> {
                List<String> ids = p.getTimeLogIds();
                if (ids != null && ids.remove(id)) {
                    p.setTimeLogIds(ids);
                    projectRepo.save(p);
                }
            });
        }
    }
}
