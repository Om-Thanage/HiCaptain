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
        gitHubService.requireCurrentRepository(owner, repoName);
        
        return gitHubService.getCommits(owner, repoName, branch, limit);
    }

    @GetMapping("/pull-requests")
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager','Developer')")
    public Flux<GitHubPullRequest> getPullRequests(
            @RequestParam String owner,
            @RequestParam String repoName,
            @RequestParam(defaultValue = "open") String state) {
        gitHubService.requireCurrentRepository(owner, repoName);
        
        return gitHubService.getPullRequests(owner, repoName, state);
    }

    @GetMapping("/stats/contributors")
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager','Developer')")
    public Mono<JsonNode> getContributorStats(
            @RequestParam String owner,
            @RequestParam String repoName) {
        gitHubService.requireCurrentRepository(owner, repoName);
        
        return gitHubService.getRepositoryStats(owner, repoName);
    }

    @GetMapping("/stats/languages")
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager','Developer')")
    public Mono<JsonNode> getLanguageStats(
            @RequestParam String owner,
            @RequestParam String repoName) {
        gitHubService.requireCurrentRepository(owner, repoName);
        
        return gitHubService.getLanguagesStats(owner, repoName);
    }

    @GetMapping("/issues")
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager','Developer')")
    public Flux<JsonNode> getIssues(
            @RequestParam String owner,
            @RequestParam String repoName,
            @RequestParam(defaultValue = "open") String state) {
        gitHubService.requireCurrentRepository(owner, repoName);
        
        return gitHubService.getIssues(owner, repoName, state);
    }

    @GetMapping("/branches")
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager','Developer')")
    public Flux<JsonNode> getBranches(
            @RequestParam String owner,
            @RequestParam String repoName) {
        gitHubService.requireCurrentRepository(owner, repoName);
        
        return gitHubService.getBranches(owner, repoName);
    }

    @PostMapping("/webhooks")
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager')")
    public Mono<ResponseEntity<JsonNode>> createWebhook(
            @RequestParam String owner,
            @RequestParam String repoName,
            @RequestParam String webhookUrl) {
        gitHubService.requireCurrentRepository(owner, repoName);
        
        return gitHubService.createWebhook(owner, repoName, webhookUrl)
                .map(ResponseEntity::ok);
    }

    @Autowired private com.HiCaptain.demo.service.GitHubWebhookService webhooks;
    @PostMapping("/webhook")
    public ResponseEntity<String> handleWebhook(jakarta.servlet.http.HttpServletRequest request,
            @RequestHeader(value="X-Hub-Signature-256", defaultValue="") String signature,
            @RequestHeader(value="X-GitHub-Event", defaultValue="") String event) throws java.io.IOException {
        byte[] body = request.getInputStream().readNBytes(2_000_001);
        if (body.length > 2_000_000) throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.PAYLOAD_TOO_LARGE);
        webhooks.receive(event, signature, body);
        return ResponseEntity.ok("Webhook accepted");
    }
}
