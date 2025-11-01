package com.HiCaptain.demo.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;

@Document(collection = "project_repository_access")
@Data
@AllArgsConstructor
@NoArgsConstructor 
public class ProjectRepositoryAccess {
    
    @Id
    private String id;
    
    // Project information
    private String projectId;
    private String projectName;
    
    // Repository information
    private String repositoryFullName; // owner/repo-name
    private String repositoryOwner;
    private String repositoryName;
    private String githubRepositoryId;
    
    // Access control
    private String grantedByUserId; // Project manager who granted access
    private List<String> authorizedUserIds; // Users who can access this repo for this project
    private List<String> authorizedRoles; // Roles that can access (Developer, Client, etc.)
    
    // Repository settings for this project
    private boolean monitoringEnabled = true;
    private boolean webhookEnabled = false;
    private boolean notificationsEnabled = true;
    
    // Specific permissions for this project
    private boolean canViewCommits = true;
    private boolean canViewPullRequests = true;
    private boolean canViewIssues = true;
    private boolean canCreateWebhooks = false;
    
    // Schedule and worker assignments
    private List<String> assignedDeveloperIds; // Developers assigned to work on this repo
    private String scheduleType; // "sprint", "continuous", "milestone"
    private LocalDateTime scheduleStartDate;
    private LocalDateTime scheduleEndDate;
    private String workingHours; // e.g., "9AM-5PM EST"
    private List<String> workingDays; // e.g., ["MONDAY", "TUESDAY", ...]
    
    // Notification settings
    private List<String> notificationEvents; // ["push", "pull_request", "issues"]
    private List<String> notificationUserIds; // Who gets notified
    private String slackChannelId; // Project-specific Slack channel
    
    // Metadata
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime lastSyncedAt;
    private boolean active = true;
    
    // Integration status
    private String integrationStatus; // "pending", "connected", "error", "disabled"
    private String lastError;
}