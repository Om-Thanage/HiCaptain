package com.HiCaptain.demo.service;

import com.HiCaptain.demo.model.Project;
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
import java.util.Set;
import java.util.HashSet;
import com.HiCaptain.demo.util.Role;

@Slf4j
@Service
public class ProjectService {
    private final ProjectRepository projectRepo;
    private final TaskRepository taskRepo;
    private final UserRepository userRepo;
    private final OrganizationService organizations;

    public ProjectService(ProjectRepository projectRepo, TaskRepository taskRepo, UserRepository userRepo, OrganizationService organizations) {
        this.projectRepo = projectRepo;
        this.taskRepo = taskRepo;
        this.userRepo = userRepo;
        this.organizations = organizations;
    }

    public List<Project> getAll() {
        String orgId = organizations.currentOrgId();
        String userId = organizations.currentUserId();
        Set<Role> roles = organizations.membership(orgId, userId).getRoles();
        return projectRepo.findAll().stream().filter(p -> canAccess(p, orgId, userId, roles)).toList();
    }

    public Optional<Project> getById(String id) {
        if (id == null) return Optional.empty();
        String orgId = organizations.currentOrgId();
        String userId = organizations.currentUserId();
        Set<Role> roles = organizations.membership(orgId, userId).getRoles();
        return projectRepo.findById(id).filter(p -> canAccess(p, orgId, userId, roles));
    }

    private boolean canAccess(Project project, String orgId, String userId, Set<Role> roles) {
        if (project == null || !orgId.equals(project.getOrganizationId())) return false;
        return roles.contains(Role.Admin)
                || roles.contains(Role.ProjectManager) && userId.equals(project.getProjectManagerId())
                || roles.contains(Role.Developer) && project.getDeveloperIds() != null && project.getDeveloperIds().contains(userId)
                || roles.contains(Role.Client) && userId.equals(project.getClientId());
    }

    public Project create(Project project) {
        log.debug("Creating project: {}", project.getName());
        project.setId(null);
        project.setOrganizationId(organizations.currentOrgId());
        validateMember(project.getClientId(), Role.Client);
        validateMember(project.getProjectManagerId(), Role.ProjectManager);
        if (project.getDeveloperIds() != null) project.getDeveloperIds().forEach(id -> validateMember(id, Role.Developer));
        Project saved = projectRepo.save(project);
        String projectId = saved.getId();
        log.debug("Project saved with ID: {}", projectId);

        // Assign to client
        if (saved.getClientId() != null && !saved.getClientId().isBlank()) {
            log.debug("Assigning project {} to client {}", projectId, saved.getClientId());
            userRepo.findById(saved.getClientId()).ifPresent(u -> {
                addProjectToUser(u, projectId);
                userRepo.save(u);
            });
        }

        // Assign to project manager
        if (saved.getProjectManagerId() != null && !saved.getProjectManagerId().isBlank()) {
            log.debug("Assigning project {} to project manager {}", projectId, saved.getProjectManagerId());
            userRepo.findById(saved.getProjectManagerId()).ifPresent(u -> {
                addProjectToUser(u, projectId);
                userRepo.save(u);
            });
        }

        // Assign to developers
        if (saved.getDeveloperIds() != null) {
            log.debug("Assigning project {} to {} developers", projectId, saved.getDeveloperIds().size());
            for (String devId : saved.getDeveloperIds()) {
                if (devId == null || devId.isBlank()) continue;
                userRepo.findById(devId).ifPresent(u -> {
                    addProjectToUser(u, projectId);
                    userRepo.save(u);
                });
            }
        }

        log.info("Project created successfully: {} (ID: {})", saved.getName(), projectId);
        return saved;
    }

    private void addProjectToUser(User user, String projectId) {
        if (user.getProjectIds() == null) {
            user.setProjectIds(List.of(projectId));
            return;
        }
        // Avoid duplicates while preserving existing entries
        Set<String> set = new HashSet<>(user.getProjectIds());
        if (set.add(projectId)) {
            user.setProjectIds(set.stream().toList());
        }
    }

    public Project update(String id, Project project) {
        getById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));
        project.setId(id);
        project.setOrganizationId(organizations.currentOrgId());
        validateMember(project.getClientId(), Role.Client);
        validateMember(project.getProjectManagerId(), Role.ProjectManager);
        if (project.getDeveloperIds() != null) project.getDeveloperIds().forEach(userId -> validateMember(userId, Role.Developer));
        return projectRepo.save(project);
    }

    public void delete(String id) {
        log.debug("Attempting to delete project: {}", id);
        Optional<Project> projectOpt = getById(id);
        if (projectOpt.isEmpty()) {
            log.warn("Project not found for deletion: {}", id);
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found");
        }

        // Cascade delete all related tasks by projectId (no reliance on Project.taskIds)
        log.debug("Deleting all tasks associated with project: {}", id);
        taskRepo.deleteByProjectId(id);

        projectRepo.deleteById(id);
        log.info("Project deleted successfully: {}", id);
    }

    public Project addDeveloper(String projectId, String developerId) {
        Project project = getById(projectId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));

        User developer = userRepo.findById(developerId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Developer not found"));

        if (!organizations.membership(organizations.currentOrgId(), developerId).getRoles().contains(com.HiCaptain.demo.util.Role.Developer)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "User is not a Developer");
        }

        // Add developer to project if not present
        java.util.Set<String> devSet = new java.util.HashSet<>();
        if (project.getDeveloperIds() != null) devSet.addAll(project.getDeveloperIds());
        boolean added = devSet.add(developerId);
        if (added) {
            project.setDeveloperIds(new java.util.ArrayList<>(devSet));
            projectRepo.save(project);
        }

        // Add project to user if not present
        addProjectToUser(developer, projectId);
        userRepo.save(developer);

        return project;
    }

    private void validateMember(String userId, Role role) {
        if (userId != null && !userId.isBlank() && !organizations.membership(organizations.currentOrgId(), userId).getRoles().contains(role))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Member does not have the required organization role");
    }
}
