package com.HiCaptain.demo.controller;

import com.HiCaptain.demo.model.GitHubRepository;
import com.HiCaptain.demo.model.GitHubCommit;
import com.HiCaptain.demo.model.GitHubPullRequest;
import com.HiCaptain.demo.service.GitHubService;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.List;

@RestController
@RequestMapping("/api/github")
@CrossOrigin(origins = "http://localhost:3000")
@ConditionalOnClass(name = "org.kohsuke.github.GitHub")
public class GitHubController {

    @Autowired
    private GitHubService gitHubService;

    @PostMapping("/repositories/sync")
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager','Developer')")
    public Mono<ResponseEntity<GitHubRepository>> syncRepository(
            @RequestParam String owner,
            @RequestParam String repoName,
            @RequestParam String projectId) {
        
        return gitHubService.syncRepository(owner, repoName, projectId)
                .map(ResponseEntity::ok);
    }

    @GetMapping("/repositories")
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager','Client','Developer')")
    public ResponseEntity<List<GitHubRepository>> getRepositoriesByProject(@RequestParam String projectId) {
        List<GitHubRepository> repositories = gitHubService.getRepositoriesByProjectId(projectId);
        return ResponseEntity.ok(repositories);
    }

    @GetMapping("/repositories/{repositoryId}")
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager','Client','Developer')")
    public ResponseEntity<GitHubRepository> getRepository(@PathVariable String repositoryId) {
        GitHubRepository repository = gitHubService.getRepositoryById(repositoryId);
        if (repository != null) {
            return ResponseEntity.ok(repository);
        }
        return ResponseEntity.notFound().build();
    }

    @DeleteMapping("/repositories/{repositoryId}")
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager')")
    public ResponseEntity<Void> deleteRepository(@PathVariable String repositoryId) {
        gitHubService.deleteRepository(repositoryId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/commits")
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager','Developer')")
    public Flux<GitHubCommit> getCommits(
            @RequestParam String owner,
            @RequestParam String repoName,
            @RequestParam(defaultValue = "main") String branch,
            @RequestParam(defaultValue = "50") int limit) {
        
        return gitHubService.getCommits(owner, repoName, branch, limit);
    }

    @GetMapping("/pull-requests")
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager','Developer')")
    public Flux<GitHubPullRequest> getPullRequests(
            @RequestParam String owner,
            @RequestParam String repoName,
            @RequestParam(defaultValue = "open") String state) {
        
        return gitHubService.getPullRequests(owner, repoName, state);
    }

    @GetMapping("/stats/contributors")
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager','Developer')")
    public Mono<JsonNode> getContributorStats(
            @RequestParam String owner,
            @RequestParam String repoName) {
        
        return gitHubService.getRepositoryStats(owner, repoName);
    }

    @GetMapping("/stats/languages")
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager','Developer')")
    public Mono<JsonNode> getLanguageStats(
            @RequestParam String owner,
            @RequestParam String repoName) {
        
        return gitHubService.getLanguagesStats(owner, repoName);
    }

    @GetMapping("/issues")
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager','Developer')")
    public Flux<JsonNode> getIssues(
            @RequestParam String owner,
            @RequestParam String repoName,
            @RequestParam(defaultValue = "open") String state) {
        
        return gitHubService.getIssues(owner, repoName, state);
    }

    @GetMapping("/branches")
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager','Developer')")
    public Flux<JsonNode> getBranches(
            @RequestParam String owner,
            @RequestParam String repoName) {
        
        return gitHubService.getBranches(owner, repoName);
    }

    @PostMapping("/webhooks")
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager')")
    public Mono<ResponseEntity<JsonNode>> createWebhook(
            @RequestParam String owner,
            @RequestParam String repoName,
            @RequestParam String webhookUrl) {
        
        return gitHubService.createWebhook(owner, repoName, webhookUrl)
                .map(ResponseEntity::ok);
    }

    @PostMapping("/webhook")
    public ResponseEntity<String> handleWebhook(
            @RequestHeader("X-GitHub-Event") String eventType,
            @RequestBody JsonNode payload) {
        
        // Handle GitHub webhook events
        try {
            switch (eventType) {
                case "push":
                    handlePushEvent(payload);
                    break;
                case "pull_request":
                    handlePullRequestEvent(payload);
                    break;
                case "issues":
                    handleIssueEvent(payload);
                    break;
                default:
                    System.out.println("Unhandled event type: " + eventType);
            }
            return ResponseEntity.ok("Webhook processed successfully");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error processing webhook: " + e.getMessage());
        }
    }

    private void handlePushEvent(JsonNode payload) {
        // Process push event - update commits in database
        String repositoryName = payload.get("repository").get("full_name").asText();
        System.out.println("Processing push event for repository: " + repositoryName);
        
        // TODO: Sync commits to database
    }

    private void handlePullRequestEvent(JsonNode payload) {
        // Process pull request event
        String action = payload.get("action").asText();
        String repositoryName = payload.get("repository").get("full_name").asText();
        int prNumber = payload.get("pull_request").get("number").asInt();
        
        System.out.println("Processing PR " + action + " event for repository: " + repositoryName + ", PR #" + prNumber);
        
        // TODO: Sync PR data to database
    }

    private void handleIssueEvent(JsonNode payload) {
        // Process issue event
        String action = payload.get("action").asText();
        String repositoryName = payload.get("repository").get("full_name").asText();
        int issueNumber = payload.get("issue").get("number").asInt();
        
        System.out.println("Processing issue " + action + " event for repository: " + repositoryName + ", Issue #" + issueNumber);
        
        // TODO: Sync issue data to database if needed
    }
}