package com.HiCaptain.demo.repository;

import com.HiCaptain.demo.model.GitHubPullRequest;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GitHubPullRequestRepository extends MongoRepository<GitHubPullRequest, String> {
    List<GitHubPullRequest> findByRepositoryIdOrderByCreatedAtDesc(String repositoryId);
    List<GitHubPullRequest> findByProjectId(String projectId);
    List<GitHubPullRequest> findByAuthorUsername(String authorUsername);
    List<GitHubPullRequest> findByState(String state);
    List<GitHubPullRequest> findByRepositoryIdAndState(String repositoryId, String state);
    Optional<GitHubPullRequest> findByGithubPrId(String githubPrId);
    List<GitHubPullRequest> findByRelatedTaskIdsContaining(String taskId);
    void deleteByRepositoryId(String repositoryId);
}