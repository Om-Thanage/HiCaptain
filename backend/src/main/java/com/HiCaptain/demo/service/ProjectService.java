package com.HiCaptain.demo.service;

import com.HiCaptain.demo.model.Project;
import com.HiCaptain.demo.repository.ProjectRepository;
import com.HiCaptain.demo.repository.TaskRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Optional;

@Service
public class ProjectService {
    private final ProjectRepository projectRepo;
    private final TaskRepository taskRepo;

    public ProjectService(ProjectRepository projectRepo, TaskRepository taskRepo) {
        this.projectRepo = projectRepo;
        this.taskRepo = taskRepo;
    }

    public List<Project> getAll() {
        return projectRepo.findAll();
    }

    public Optional<Project> getById(String id) {
        return projectRepo.findById(id);
    }

    public Project create(Project project) {
        return projectRepo.save(project);
    }

    public Project update(String id, Project project) {
        if (!projectRepo.existsById(id))
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found");
        project.setId(id);
        return projectRepo.save(project);
    }

    public void delete(String id) {
        Optional<Project> projectOpt = projectRepo.findById(id);
        if (projectOpt.isEmpty())
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found");

        // Cascade delete all related tasks by projectId (no reliance on Project.taskIds)
        taskRepo.deleteByProjectId(id);

        projectRepo.deleteById(id);
    }
}
