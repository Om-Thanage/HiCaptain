package com.HiCaptain.demo.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;

@Document(collection = "github_connections")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class GitHubConnection {
    
    @Id
    private String id;
    
    // User who owns this connection
    private String userId;
    private String username; // HiCaptain username
    
    // GitHub account information
    private String githubUserId;
    private String githubUsername;
    private String githubEmail;
    private String githubAvatarUrl;
    
    // Authentication
    @com.fasterxml.jackson.annotation.JsonIgnore
    private String accessToken;
    private String tokenType = "Bearer";
    private String[] scopes; // Permissions granted
    private LocalDateTime tokenExpiresAt;
    @com.fasterxml.jackson.annotation.JsonIgnore
    private String refreshToken;
    
    // Connection status
    private boolean active = true;
    private LocalDateTime connectedAt;
    private LocalDateTime lastUsedAt;
    private LocalDateTime lastSyncAt;
    
    // Repository access permissions
    private List<String> accessibleRepositories; // List of repo full names (owner/repo)
    private boolean canAccessAllRepos = false;
    private boolean canAccessPrivateRepos = false;
    
    // Connection method
    private String connectionMethod; // "OAUTH", "PERSONAL_TOKEN", "GITHUB_APP"
    
    // Metadata
    private String ipAddress; // IP when connected
    private String userAgent; // Browser info when connected
}
