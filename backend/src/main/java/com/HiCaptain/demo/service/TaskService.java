package com.HiCaptain.demo.service;

import com.HiCaptain.demo.model.Project;
import com.HiCaptain.demo.model.Task;
import com.HiCaptain.demo.model.User;
import com.HiCaptain.demo.repository.ProjectRepository;
import com.HiCaptain.demo.repository.TaskRepository;
import com.HiCaptain.demo.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Optional;

@Slf4j
@Service
public class TaskService {
    private final TaskRepository taskRepo;
    private final ProjectRepository projectRepo;
    private final UserRepository userRepo;
    private final ProjectService projects;
    private final OrganizationService organizations;

    public TaskService(TaskRepository taskRepo, ProjectRepository projectRepo, UserRepository userRepo, ProjectService projects, OrganizationService organizations) {
        this.taskRepo = taskRepo;
        this.projectRepo = projectRepo;
        this.userRepo = userRepo;
        this.projects = projects;
        this.organizations = organizations;
    }

    public List<Task> getAll() {
        List<Task> tasks = taskRepo.findAll().stream().filter(t -> projects.getById(t.getProjectId()).isPresent()).toList();
        log.debug("TaskService.getAll() - Found {} tasks", tasks.size());
        if (log.isTraceEnabled()) {
            for (Task task : tasks) {
                log.trace("Task: {} - {} (Project: {})", task.getId(), task.getTitle(), task.getProjectId());
            }
        }
        return tasks;
    }

    public Optional<Task> getById(String id) {
        return taskRepo.findById(id).filter(t -> projects.getById(t.getProjectId()).isPresent());
    }

    public Task create(Task t) {
        log.debug("Creating task: {} for project: {}", t.getTitle(), t.getProjectId());
        requireProject(t.getProjectId());
        validateDevelopers(t.getProjectId(), t.getAssignedDeveloperIds());
        t.setId(null);
        t.setCreatedBy(organizations.currentUserId());
        t.setAssigneeId(t.getAssignedDeveloperIds() == null || t.getAssignedDeveloperIds().isEmpty() ? null : t.getAssignedDeveloperIds().get(0));
        // Set timestamps
        t.setCreatedAt(java.time.LocalDateTime.now());
        t.setUpdatedAt(java.time.LocalDateTime.now());
        
        Task savedTask = taskRepo.save(t);
        log.debug("Task saved with ID: {}", savedTask.getId());

        // Auto-update all Developers
        if (t.getAssignedDeveloperIds() != null) {
            log.debug("Assigning task to {} developers", t.getAssignedDeveloperIds().size());
            for (String devId : t.getAssignedDeveloperIds()) {
                userRepo.findById(devId).ifPresent(user -> {
                    List<String> devTasks = user.getTaskIds();
                    if (devTasks == null) devTasks = new java.util.ArrayList<>();
                    if (!devTasks.contains(savedTask.getId())) {
                        devTasks.add(savedTask.getId());
                        user.setTaskIds(devTasks);
                        userRepo.save(user);
                    }
                });
            }
        }

        log.info("Task created successfully: {} (ID: {})", savedTask.getTitle(), savedTask.getId());
        return savedTask;
    }

    public Task update(String id, Task t) {
        Task existing = getById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Task not found"));

        log.debug("Updating task {} with new data: {} (status: {})", id, t.getTitle(), t.getStatus());
        log.debug("Existing task: {} (status: {})", existing.getTitle(), existing.getStatus());

        // Merge the changes instead of replacing the entire object
        if (t.getTitle() != null) existing.setTitle(t.getTitle());
        if (t.getDescription() != null) existing.setDescription(t.getDescription());
        if (t.getStatus() != null) existing.setStatus(t.getStatus());
        if (t.getPriority() != null) existing.setPriority(t.getPriority());
        if (t.getDeadline() != null) existing.setDeadline(t.getDeadline());
        if (t.getProjectId() != null && !t.getProjectId().equals(existing.getProjectId())) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tasks cannot be moved between projects through an edit");
        if (t.getAssignedDeveloperIds() != null) { validateDevelopers(existing.getProjectId(), t.getAssignedDeveloperIds()); existing.setAssignedDeveloperIds(t.getAssignedDeveloperIds()); }
        existing.setAssigneeId(existing.getAssignedDeveloperIds() == null || existing.getAssignedDeveloperIds().isEmpty() ? null : existing.getAssignedDeveloperIds().get(0));
        if (t.getCategory() != null) existing.setCategory(t.getCategory());
        if (t.getEstimatedHours() > 0) existing.setEstimatedHours(t.getEstimatedHours());
        if (t.getActualHours() > 0) existing.setActualHours(t.getActualHours());
        if (t.getProgress() >= 0) existing.setProgress(t.getProgress());

        // Always update the modification timestamp
        existing.setUpdatedAt(java.time.LocalDateTime.now());
        
        log.debug("Merged task: {} (status: {})", existing.getTitle(), existing.getStatus());
        
        Task saved = taskRepo.save(existing);
        log.info("Task updated successfully: {} (ID: {})", saved.getTitle(), saved.getId());
        return saved;
    }

    public void delete(String id) {
        Optional<Task> taskOpt = getById(id);
        if (taskOpt.isEmpty())
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Task not found");

        Task task = taskOpt.get();
        taskRepo.deleteById(id);

        // No Project.taskIds maintenance

        // Remove from each developer
        if (task.getAssignedDeveloperIds() != null) {
            for (String devId : task.getAssignedDeveloperIds()) {
                userRepo.findById(devId).ifPresent(user -> {
                    List<String> devTasks = user.getTaskIds();
                    if (devTasks != null && devTasks.remove(task.getId())) {
                        user.setTaskIds(devTasks);
                        userRepo.save(user);
                    }
                });
            }
        }
    }

    private void requireProject(String id) {
        projects.getById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));
    }

    private void validateDevelopers(String projectId, List<String> ids) {
        Project project = projects.getById(projectId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (ids != null) for (String id : ids) {
            if (project.getDeveloperIds() == null || !project.getDeveloperIds().contains(id)
                    || !organizations.membership(organizations.currentOrgId(), id).getRoles().contains(com.HiCaptain.demo.util.Role.Developer))
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Assign only existing project developers; manage project access separately");
        }
    }
}
