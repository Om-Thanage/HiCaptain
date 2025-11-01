package com.HiCaptain.demo.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;

@Document(collection = "github_commits")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class GitHubCommit {

    @Id
    private String id;
    
    private String sha;
    private String message;
    private String authorName;
    private String authorEmail;
    private String authorUsername;
    private String committerName;
    private String committerEmail;
    
    private LocalDateTime authorDate;
    private LocalDateTime committerDate;
    
    private String repositoryId;
    private String repositoryName;
    private String branch;
    
    private List<String> modifiedFiles;
    private int additions;
    private int deletions;
    private int totalChanges;
    
    private String htmlUrl;
    private String apiUrl;
    
    private String projectId;
    private String taskId; // If commit is related to a specific task
    
    private LocalDateTime createdAt;
}