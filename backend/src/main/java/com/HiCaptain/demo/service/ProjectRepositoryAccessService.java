package com.HiCaptain.demo.service;

import com.HiCaptain.demo.model.ProjectRepositoryAccess;
import com.HiCaptain.demo.model.Project;
import com.HiCaptain.demo.model.User;
import com.HiCaptain.demo.repository.ProjectRepositoryAccessRepository;
import com.HiCaptain.demo.repository.ProjectRepository;
import com.HiCaptain.demo.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Arrays;

@Service
public class ProjectRepositoryAccessService {

    @Autowired
    private ProjectRepositoryAccessRepository accessRepository;

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private GitHubOAuthService githubOAuthService;

    /**
     * Grant repository access to a project with specific team members
     */
    public ProjectRepositoryAccess grantRepositoryAccess(
            String projectId, 
            String repositoryFullName, 
            String grantedByUserId,
            List<String> authorizedUserIds,
            List<String> assignedDeveloperIds,
            String scheduleType,
            LocalDateTime scheduleStartDate,
            LocalDateTime scheduleEndDate) {

        // Verify project exists
        Optional<Project> project = projectRepository.findById(projectId);
        if (project.isEmpty()) {
            throw new RuntimeException("Project not found: " + projectId);
        }

        // Verify granting user has permission (project manager or admin)
        Optional<User> grantingUser = userRepository.findById(grantedByUserId);
        if (grantingUser.isEmpty()) {
            throw new RuntimeException("Granting user not found: " + grantedByUserId);
        }

        String userRole = grantingUser.get().getRole().toString();
        if (!userRole.equals("Admin") && !userRole.equals("ProjectManager")) {
            throw new RuntimeException("Only Admins and Project Managers can grant repository access");
        }

        // Check if granting user has access to this repository
        boolean hasGitHubAccess = githubOAuthService.hasRepositoryAccess(grantedByUserId, repositoryFullName);
        if (!hasGitHubAccess) {
            throw new RuntimeException("Granting user does not have access to repository: " + repositoryFullName);
        }

        // Check if access already exists
        Optional<ProjectRepositoryAccess> existingAccess = 
            accessRepository.findByProjectIdAndRepositoryFullName(projectId, repositoryFullName);

        ProjectRepositoryAccess access;
        if (existingAccess.isPresent()) {
            // Update existing access
            access = existingAccess.get();
            access.setUpdatedAt(LocalDateTime.now());
        } else {
            // Create new access
            access = new ProjectRepositoryAccess();
            access.setProjectId(projectId);
            access.setProjectName(project.get().getName());
            access.setCreatedAt(LocalDateTime.now());
        }

        // Set repository information
        String[] repoParts = repositoryFullName.split("/");
        access.setRepositoryFullName(repositoryFullName);
        access.setRepositoryOwner(repoParts[0]);
        access.setRepositoryName(repoParts[1]);

        // Set access control
        access.setGrantedByUserId(grantedByUserId);
        access.setAuthorizedUserIds(authorizedUserIds);
        access.setAssignedDeveloperIds(assignedDeveloperIds);

        // Set schedule
        access.setScheduleType(scheduleType);
        access.setScheduleStartDate(scheduleStartDate);
        access.setScheduleEndDate(scheduleEndDate);

        // Set default permissions based on user roles
        access.setAuthorizedRoles(Arrays.asList("Developer", "ProjectManager", "Admin"));
        access.setCanViewCommits(true);
        access.setCanViewPullRequests(true);
        access.setCanViewIssues(true);

        // Set metadata
        access.setUpdatedAt(LocalDateTime.now());
        access.setActive(true);
        access.setIntegrationStatus("connected");

        return accessRepository.save(access);
    }

    /**
     * Check if a user has access to a repository within a project context
     */
    public boolean hasProjectRepositoryAccess(String userId, String projectId, String repositoryFullName) {
        return accessRepository.existsByProjectIdAndRepositoryFullNameAndAuthorizedUserIdsContaining(
            projectId, repositoryFullName, userId);
    }

    /**
     * Get all repositories accessible for a project
     */
    public List<ProjectRepositoryAccess> getProjectRepositories(String projectId) {
        return accessRepository.findByProjectIdAndActive(projectId, true);
    }

    /**
     * Get all projects a user has repository access to
     */
    public List<ProjectRepositoryAccess> getUserAccessibleRepositories(String userId) {
        return accessRepository.findByAuthorizedUserIdsContaining(userId);
    }

    /**
     * Get repositories assigned to a specific developer
     */
    public List<ProjectRepositoryAccess> getDeveloperAssignedRepositories(String developerId) {
        return accessRepository.findByAssignedDeveloperIdsContaining(developerId);
    }

    /**
     * Update repository access permissions
     */
    public ProjectRepositoryAccess updateRepositoryAccess(
            String accessId,
            List<String> authorizedUserIds,
            List<String> assignedDeveloperIds,
            boolean monitoringEnabled,
            boolean webhookEnabled) {

        Optional<ProjectRepositoryAccess> accessOpt = accessRepository.findById(accessId);
        if (accessOpt.isEmpty()) {
            throw new RuntimeException("Repository access not found: " + accessId);
        }

        ProjectRepositoryAccess access = accessOpt.get();
        access.setAuthorizedUserIds(authorizedUserIds);
        access.setAssignedDeveloperIds(assignedDeveloperIds);
        access.setMonitoringEnabled(monitoringEnabled);
        access.setWebhookEnabled(webhookEnabled);
        access.setUpdatedAt(LocalDateTime.now());

        return accessRepository.save(access);
    }

    /**
     * Revoke repository access for a project
     */
    public void revokeRepositoryAccess(String projectId, String repositoryFullName, String revokedByUserId) {
        // Verify revoking user has permission
        Optional<User> revokingUser = userRepository.findById(revokedByUserId);
        if (revokingUser.isEmpty()) {
            throw new RuntimeException("Revoking user not found: " + revokedByUserId);
        }

        String userRole = revokingUser.get().getRole().toString();
        if (!userRole.equals("Admin") && !userRole.equals("ProjectManager")) {
            throw new RuntimeException("Only Admins and Project Managers can revoke repository access");
        }

        Optional<ProjectRepositoryAccess> access = 
            accessRepository.findByProjectIdAndRepositoryFullName(projectId, repositoryFullName);

        if (access.isPresent()) {
            ProjectRepositoryAccess accessToRevoke = access.get();
            accessToRevoke.setActive(false);
            accessToRevoke.setUpdatedAt(LocalDateTime.now());
            accessToRevoke.setIntegrationStatus("disabled");
            accessRepository.save(accessToRevoke);
        }
    }

    /**
     * Update schedule for repository access
     */
    public ProjectRepositoryAccess updateRepositorySchedule(
            String accessId,
            String scheduleType,
            LocalDateTime scheduleStartDate,
            LocalDateTime scheduleEndDate,
            String workingHours,
            List<String> workingDays) {

        Optional<ProjectRepositoryAccess> accessOpt = accessRepository.findById(accessId);
        if (accessOpt.isEmpty()) {
            throw new RuntimeException("Repository access not found: " + accessId);
        }

        ProjectRepositoryAccess access = accessOpt.get();
        access.setScheduleType(scheduleType);
        access.setScheduleStartDate(scheduleStartDate);
        access.setScheduleEndDate(scheduleEndDate);
        access.setWorkingHours(workingHours);
        access.setWorkingDays(workingDays);
        access.setUpdatedAt(LocalDateTime.now());

        return accessRepository.save(access);
    }

    /**
     * Get repositories that need monitoring (for background jobs)
     */
    public List<ProjectRepositoryAccess> getRepositoriesForMonitoring() {
        return accessRepository.findByMonitoringEnabledAndActive(true, true);
    }
}