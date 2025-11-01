package com.HiCaptain.demo.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;

@Document(collection = "github_repositories")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class GitHubRepository {

    @Id
    private String id;
    
    private String githubRepoId;
    private String name;
    private String fullName;
    private String description;
    private String htmlUrl;
    private String cloneUrl;
    private String sshUrl;
    private String defaultBranch;
    
    private String language;
    private List<String> topics;
    private int stargazersCount;
    private int forksCount;
    private int openIssuesCount;
    private long size;
    
    private boolean isPrivate;
    private boolean hasIssues;
    private boolean hasProjects;
    private boolean hasWiki;
    private boolean archived;
    private boolean disabled;
    
    private String ownerId;
    private String ownerLogin;
    private String ownerType; // User or Organization
    
    private String projectId; // Link to HiCaptain project
    
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime pushedAt;
    private LocalDateTime lastSyncAt;
}