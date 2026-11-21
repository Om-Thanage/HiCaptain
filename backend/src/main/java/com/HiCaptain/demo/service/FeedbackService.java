package com.HiCaptain.demo.service;

import com.HiCaptain.demo.model.Feedback;
import com.HiCaptain.demo.repository.FeedbackRepository;
import com.HiCaptain.demo.repository.ProjectRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;

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

    private static final Set<String> STATUSES = Set.of("open", "in-progress", "resolved");

    public Feedback create(Feedback f) {
        requireProject(f.getProjectId());
        f.setUserId(organizations.currentUserId());
        requireMember(f.getUserId());
        f.setId(null);
        // The server sets the author, date and initial status; clients only send project and text.
        f.setMessage(validMessage(f.getMessage()));
        f.setDateIssued(LocalDate.now());
        f.setStatus("open");
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
        String newProjectId = f.getProjectId() == null ? oldProjectId : f.getProjectId();
        requireProject(newProjectId);
        if (f.getStatus() == null || !STATUSES.contains(f.getStatus()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Status must be open, in-progress or resolved");

        // Triage changes the status, text or project; the author and date never change.
        f.setId(id);
        f.setProjectId(newProjectId);
        f.setMessage(validMessage(f.getMessage()));
        f.setUserId(existing.getUserId());
        f.setDateIssued(existing.getDateIssued());
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

    private static String validMessage(String message) {
        String text = message == null ? "" : message.trim();
        if (text.isEmpty() || text.length() > 5000)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Feedback must be between 1 and 5000 characters");
        return text;
    }

    private void requireProject(String id) {
        projects.getById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));
    }

    private void requireMember(String id) {
        if (id != null && !id.isBlank()) organizations.membership(organizations.currentOrgId(), id);
    }
}
