package com.HiCaptain.demo.repository;

import com.HiCaptain.demo.model.GitHubRepository;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GitHubRepositoryRepository extends MongoRepository<GitHubRepository, String> {
    List<GitHubRepository> findByProjectId(String projectId);
    List<GitHubRepository> findByFullName(String fullName);
    Optional<GitHubRepository> findByGithubRepoId(String githubRepoId);
    List<GitHubRepository> findByOwnerLogin(String ownerLogin);
    List<GitHubRepository> findByLanguage(String language);
    List<GitHubRepository> findByIsPrivate(boolean isPrivate);
    void deleteByProjectId(String projectId);
}
