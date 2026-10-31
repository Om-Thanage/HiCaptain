package com.HiCaptain.demo.service;

import com.HiCaptain.demo.model.Feedback;
import com.HiCaptain.demo.repository.FeedbackRepository;
import com.HiCaptain.demo.repository.ProjectRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Service
public class FeedbackService {
    @org.springframework.beans.factory.annotation.Autowired private OrganizationService organizations;
    @org.springframework.beans.factory.annotation.Autowired private ProjectService projects;
    private final FeedbackRepository repo;
    private final ProjectRepository projectRepo;

    public FeedbackService(FeedbackRepository repo, ProjectRepository projectRepo) {
        this.repo = repo;
        this.projectRepo = projectRepo;
    }

    public List<Feedback> getAll() { return repo.findAll().stream().filter(item -> projects.getById(item.getProjectId()).isPresent()).toList(); }

    public Optional<Feedback> getById(String id) { return repo.findById(id).filter(item -> projects.getById(item.getProjectId()).isPresent()); }

    public Feedback create(Feedback f) {
        requireProject(f.getProjectId());
        f.setUserId(organizations.currentUserId());
        requireMember(f.getUserId());
        f.setId(null);
        Feedback saved = repo.save(f);
        if (saved.getProjectId() != null) {
            projectRepo.findById(saved.getProjectId()).ifPresent(p -> {
                List<String> ids = p.getFeedbackIds();
                if (ids == null) ids = new ArrayList<>();
                if (!ids.contains(saved.getId())) {
                    ids.add(saved.getId());
                    p.setFeedbackIds(ids);
                    projectRepo.save(p);
                }
            });
        }
        return saved;
    }

    public Feedback update(String id, Feedback f) {
        Feedback existing = getById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Feedback not found"));

        String oldProjectId = existing.getProjectId();
        String newProjectId = f.getProjectId();
        requireProject(newProjectId);
        requireMember(f.getUserId());

        f.setId(id);
        Feedback saved = repo.save(f);

        if (!Objects.equals(oldProjectId, newProjectId)) {
            if (oldProjectId != null) {
                projectRepo.findById(oldProjectId).ifPresent(p -> {
                    List<String> ids = p.getFeedbackIds();
                    if (ids != null && ids.remove(id)) {
                        p.setFeedbackIds(ids);
                        projectRepo.save(p);
                    }
                });
            }
        }
        if (newProjectId != null) {
            projectRepo.findById(newProjectId).ifPresent(p -> {
                List<String> ids = p.getFeedbackIds();
                if (ids == null) ids = new ArrayList<>();
                if (!ids.contains(id)) {
                    ids.add(id);
                    p.setFeedbackIds(ids);
                    projectRepo.save(p);
                }
            });
        }

        return saved;
    }

    public void delete(String id) {
        Feedback existing = getById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Feedback not found"));

        repo.deleteById(id);

        if (existing.getProjectId() != null) {
            projectRepo.findById(existing.getProjectId()).ifPresent(p -> {
                List<String> ids = p.getFeedbackIds();
                if (ids != null && ids.remove(id)) {
                    p.setFeedbackIds(ids);
                    projectRepo.save(p);
                }
            });
        }
    }

    private void requireProject(String id) {
        projects.getById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));
    }

    private void requireMember(String id) {
        if (id != null && !id.isBlank()) organizations.membership(organizations.currentOrgId(), id);
    }
}
