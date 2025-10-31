package com.HiCaptain.demo.service;

import com.HiCaptain.demo.model.Task;
import com.HiCaptain.demo.repository.ProjectRepository;
import com.HiCaptain.demo.repository.TaskRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Optional;

@Service
public class TaskService {
    private final TaskRepository taskRepo;
    private final ProjectRepository projectRepo;

    public TaskService(TaskRepository taskRepo, ProjectRepository projectRepo) {
        this.taskRepo = taskRepo;
        this.projectRepo = projectRepo;
    }

    public List<Task> getAll() {
        return taskRepo.findAll();
    }

    public Optional<Task> getById(String id) {
        return taskRepo.findById(id);
    }

    public Task create(Task t) {
        Task savedTask = taskRepo.save(t);

        // Auto-update the corresponding project
        projectRepo.findById(t.getProjectId()).ifPresent(project -> {
            List<String> taskIds = project.getTaskIds();
            if (taskIds == null) taskIds = new java.util.ArrayList<>();
            if (!taskIds.contains(savedTask.getId())) {
                taskIds.add(savedTask.getId());
                project.setTaskIds(taskIds);
                projectRepo.save(project);
            }
        });

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

        // Remove the task from project’s taskIds
        projectRepo.findById(task.getProjectId()).ifPresent(project -> {
            List<String> taskIds = project.getTaskIds();
            if (taskIds != null && taskIds.remove(task.getId())) {
                project.setTaskIds(taskIds);
                projectRepo.save(project);
            }
        });
    }
}
