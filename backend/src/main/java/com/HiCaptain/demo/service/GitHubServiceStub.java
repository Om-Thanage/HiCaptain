package com.HiCaptain.demo.service;

import com.HiCaptain.demo.model.GitHubRepository;
import com.HiCaptain.demo.model.GitHubCommit;
import com.HiCaptain.demo.model.GitHubPullRequest;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingClass;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.ArrayList;

@Service
@ConditionalOnMissingClass("org.kohsuke.github.GitHub")
public class GitHubServiceStub {

    private final ObjectMapper objectMapper = new ObjectMapper();

    public Mono<GitHubRepository> syncRepository(String owner, String repoName, String projectId) {
        return Mono.error(new RuntimeException("GitHub integration is not available. Please configure GitHub API dependencies."));
    }

    public Flux<GitHubCommit> getCommits(String owner, String repoName, String branch, int limit) {
        return Flux.empty();
    }

    public Flux<GitHubPullRequest> getPullRequests(String owner, String repoName, String state) {
        return Flux.empty();
    }

    public Mono<JsonNode> getRepositoryStats(String owner, String repoName) {
        return Mono.just(objectMapper.createObjectNode());
    }

    public Mono<JsonNode> getLanguagesStats(String owner, String repoName) {
        return Mono.just(objectMapper.createObjectNode());
    }

    public Flux<JsonNode> getIssues(String owner, String repoName, String state) {
        return Flux.empty();
    }

    public Flux<JsonNode> getBranches(String owner, String repoName) {
        return Flux.empty();
    }

    public Mono<JsonNode> createWebhook(String owner, String repoName, String webhookUrl) {
        return Mono.error(new RuntimeException("GitHub integration is not available. Please configure GitHub API dependencies."));
    }

    public List<GitHubRepository> getRepositoriesByProjectId(String projectId) {
        return new ArrayList<>();
    }

    public GitHubRepository getRepositoryById(String repositoryId) {
        return null;
    }

    public void deleteRepository(String repositoryId) {
        // No-op
    }
}