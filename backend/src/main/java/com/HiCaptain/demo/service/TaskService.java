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
        return taskRepo.findAll();
    }

    public Optional<Task> getById(String id) {
        return taskRepo.findById(id);
    }

    public Task create(Task t) {
        Task savedTask = taskRepo.save(t);

        // Auto-update Project
        projectRepo.findById(t.getProjectId()).ifPresent(project -> {
            List<String> taskIds = project.getTaskIds();
            if (taskIds == null) taskIds = new java.util.ArrayList<>();
            if (!taskIds.contains(savedTask.getId())) {
                taskIds.add(savedTask.getId());
                project.setTaskIds(taskIds);
            }

            // Auto-update Project.developerIds from Task.assignedDeveloperIds
            if (t.getAssignedDeveloperIds() != null && !t.getAssignedDeveloperIds().isEmpty()) {
                List<String> projectDevs = project.getDeveloperIds();
                java.util.Set<String> merged = new java.util.HashSet<>();
                if (projectDevs != null) merged.addAll(projectDevs);
                merged.addAll(t.getAssignedDeveloperIds());
                project.setDeveloperIds(new java.util.ArrayList<>(merged));
            }

            projectRepo.save(project);
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
        if (!taskRepo.existsById(id))
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Task not found");

        t.setId(id);
        return taskRepo.save(t);
    }

    public void delete(String id) {
        Optional<Task> taskOpt = taskRepo.findById(id);
        if (taskOpt.isEmpty())
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Task not found");

        Task task = taskOpt.get();
        taskRepo.deleteById(id);

        // ✅ Remove from project
        projectRepo.findById(task.getProjectId()).ifPresent(project -> {
            List<String> taskIds = project.getTaskIds();
            if (taskIds != null && taskIds.remove(task.getId())) {
                project.setTaskIds(taskIds);
                projectRepo.save(project);
            }
        });

        // ✅ Remove from each developer
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
