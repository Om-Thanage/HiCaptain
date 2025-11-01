package com.HiCaptain.demo.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "repository_access")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class RepositoryAccess {
    
    @Id
    private String id;
    
    // The GitHub repository information
    private String repositoryFullName; // owner/repo-name
    private String repositoryId;
    private String repositoryName;
    private String repositoryOwner;
    
    // Access control
    private String grantedBy; // User ID who granted access
    private String grantedTo; // User ID who was granted access (or "PUBLIC" for public access)
    private String projectId; // Project this repository is linked to
    
    // Permission levels
    private String accessLevel; // "READ", "WRITE", "ADMIN"
    private boolean canViewCommits;
    private boolean canViewPullRequests;
    private boolean canViewIssues;
    private boolean canCreateWebhooks;
    private boolean canManageAccess;
    
    // Monitoring settings
    private boolean monitoringEnabled;
    private boolean webhookEnabled;
    private String webhookUrl;
    
    // GitHub token/authentication for this specific repository
    private String githubToken; // Encrypted token for accessing this specific repo
    private String tokenScope; // Scopes available for this token
    
    // Metadata
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime lastAccessedAt;
    private boolean active;
    
    // Additional settings
    private String[] notificationEvents; // Events to send notifications for
    private String slackChannel; // Optional Slack integration
    private String emailNotifications; // Email for notifications
}