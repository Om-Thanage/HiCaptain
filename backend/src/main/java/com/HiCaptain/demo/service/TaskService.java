package com.HiCaptain.demo.service;

import com.HiCaptain.demo.model.Project;
import com.HiCaptain.demo.model.Task;
import com.HiCaptain.demo.model.User;
import com.HiCaptain.demo.repository.ProjectRepository;
import com.HiCaptain.demo.repository.TaskRepository;
import com.HiCaptain.demo.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Optional;

@Service
public class TaskService {
    private final TaskRepository taskRepo;
    private final ProjectRepository projectRepo;
    private final UserRepository userRepo;

    public TaskService(TaskRepository taskRepo, ProjectRepository projectRepo, UserRepository userRepo) {
        this.taskRepo = taskRepo;
        this.projectRepo = projectRepo;
        this.userRepo = userRepo;
    }

    public List<Task> getAll() {
        List<Task> tasks = taskRepo.findAll();
        System.out.println("TaskService.getAll() - Found " + tasks.size() + " tasks");
        for (Task task : tasks) {
            System.out.println("Task: " + task.getId() + " - " + task.getTitle() + " (Project: " + task.getProjectId() + ")");
        }
        return tasks;
    }

    public Optional<Task> getById(String id) {
        return taskRepo.findById(id);
    }

    public Task create(Task t) {
        // Set timestamps
        t.setCreatedAt(java.time.LocalDateTime.now());
        t.setUpdatedAt(java.time.LocalDateTime.now());
        
        Task savedTask = taskRepo.save(t);

        // Auto-update Project.developerIds from Task.assignedDeveloperIds (no taskIds maintenance)
        projectRepo.findById(t.getProjectId()).ifPresent(project -> {
            if (t.getAssignedDeveloperIds() != null && !t.getAssignedDeveloperIds().isEmpty()) {
                List<String> projectDevs = project.getDeveloperIds();
                java.util.Set<String> merged = new java.util.HashSet<>();
                if (projectDevs != null) merged.addAll(projectDevs);
                merged.addAll(t.getAssignedDeveloperIds());
                project.setDeveloperIds(new java.util.ArrayList<>(merged));
                projectRepo.save(project);
            }
        });

        // Auto-update all Developers
        if (t.getAssignedDeveloperIds() != null) {
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

        return savedTask;
    }

    public Task update(String id, Task t) {
        Task existing = taskRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Task not found"));

        System.out.println("Updating task " + id + " with new data: " + t.getTitle() + " (status: " + t.getStatus() + ")");
        System.out.println("Existing task: " + existing.getTitle() + " (status: " + existing.getStatus() + ")");

        // Merge the changes instead of replacing the entire object
        if (t.getTitle() != null) existing.setTitle(t.getTitle());
        if (t.getDescription() != null) existing.setDescription(t.getDescription());
        if (t.getStatus() != null) existing.setStatus(t.getStatus());
        if (t.getPriority() != null) existing.setPriority(t.getPriority());
        if (t.getDeadline() != null) existing.setDeadline(t.getDeadline());
        if (t.getProjectId() != null) existing.setProjectId(t.getProjectId());
        if (t.getAssignedDeveloperIds() != null) existing.setAssignedDeveloperIds(t.getAssignedDeveloperIds());
        if (t.getAssigneeId() != null) existing.setAssigneeId(t.getAssigneeId());
        if (t.getCreatedBy() != null) existing.setCreatedBy(t.getCreatedBy());
        if (t.getCategory() != null) existing.setCategory(t.getCategory());
        if (t.getEstimatedHours() > 0) existing.setEstimatedHours(t.getEstimatedHours());
        if (t.getActualHours() > 0) existing.setActualHours(t.getActualHours());
        if (t.getProgress() >= 0) existing.setProgress(t.getProgress());

        // Always update the modification timestamp
        existing.setUpdatedAt(java.time.LocalDateTime.now());
        
        System.out.println("Merged task: " + existing.getTitle() + " (status: " + existing.getStatus() + ")");
        
        Task saved = taskRepo.save(existing);
        String newProjectId = existing.getProjectId();

        // No Project.taskIds maintenance; only ensure developers are merged into the new project's developerIds
        if (newProjectId != null) {
            projectRepo.findById(newProjectId).ifPresent(project -> {
                if (existing.getAssignedDeveloperIds() != null && !existing.getAssignedDeveloperIds().isEmpty()) {
                    List<String> projectDevs = project.getDeveloperIds();
                    java.util.Set<String> merged = new java.util.HashSet<>();
                    if (projectDevs != null) merged.addAll(projectDevs);
                    merged.addAll(existing.getAssignedDeveloperIds());
                    project.setDeveloperIds(new java.util.ArrayList<>(merged));
                    projectRepo.save(project);
                }
            });
        }

        return saved;
    }

    public void delete(String id) {
        Optional<Task> taskOpt = taskRepo.findById(id);
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
}
