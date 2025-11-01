package com.HiCaptain.demo.repository;

import com.HiCaptain.demo.model.GitHubCommit;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface GitHubCommitRepository extends MongoRepository<GitHubCommit, String> {
    List<GitHubCommit> findByRepositoryIdOrderByAuthorDateDesc(String repositoryId);
    List<GitHubCommit> findByProjectId(String projectId);
    List<GitHubCommit> findByAuthorUsername(String authorUsername);
    List<GitHubCommit> findByAuthorUsernameOrderByAuthorDateDesc(String authorUsername);
    List<GitHubCommit> findByRepositoryIdAndBranch(String repositoryId, String branch);
    List<GitHubCommit> findByAuthorDateBetween(LocalDateTime startDate, LocalDateTime endDate);
    List<GitHubCommit> findByTaskId(String taskId);
    List<GitHubCommit> findTop10ByOrderByAuthorDateDesc();
    void deleteByRepositoryId(String repositoryId);
}