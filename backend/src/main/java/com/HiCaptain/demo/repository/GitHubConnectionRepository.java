package com.HiCaptain.demo.repository;

import com.HiCaptain.demo.model.GitHubConnection;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GitHubConnectionRepository extends MongoRepository<GitHubConnection, String> {
    
    Optional<GitHubConnection> findByUserId(String userId);
    Optional<GitHubConnection> findByGithubUserId(String githubUserId);
    Optional<GitHubConnection> findByGithubUsername(String githubUsername);
    Optional<GitHubConnection> findByUserIdAndActive(String userId, boolean active);
    
    List<GitHubConnection> findByActiveTrue();
    List<GitHubConnection> findByAccessibleRepositoriesContaining(String repositoryFullName);
    
    boolean existsByUserIdAndActive(String userId, boolean active);
    boolean existsByGithubUserIdAndActive(String githubUserId, boolean active);
}