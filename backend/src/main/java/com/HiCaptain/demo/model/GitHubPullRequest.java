package com.HiCaptain.demo.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;

@Document(collection = "github_pull_requests")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class GitHubPullRequest {

    @Id
    private String id;
    
    private String githubPrId;
    private int number;
    private String title;
    private String body;
    private String state; // open, closed, merged
    private boolean draft;
    
    private String authorUsername;
    private String authorName;
    
    private String headBranch;
    private String baseBranch;
    private String headSha;
    private String baseSha;
    
    private String repositoryId;
    private String repositoryName;
    
    private List<String> assignees;
    private List<String> reviewers;
    private List<String> labels;
    
    private int additions;
    private int deletions;
    private int changedFiles;
    private int commits;
    
    private boolean mergeable;
    private String mergeableState;
    private boolean merged;
    private String mergedBy;
    private LocalDateTime mergedAt;
    
    private String htmlUrl;
    private String apiUrl;
    
    private String projectId;
    private List<String> relatedTaskIds;
    
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime closedAt;
}