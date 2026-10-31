package com.HiCaptain.demo.service;

import com.HiCaptain.demo.model.GitHubRepository;
import com.HiCaptain.demo.model.GitHubCommit;
import com.HiCaptain.demo.model.GitHubPullRequest;
import com.HiCaptain.demo.repository.GitHubRepositoryRepository;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.kohsuke.github.GHRepository;
import org.kohsuke.github.GitHub;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class GitHubService {

    private final GitHubOAuthService oauth;
    private final OrganizationService organizations;
    @org.springframework.beans.factory.annotation.Value("${github.api.base-url:https://api.github.com}")
    private String apiBase;
    private final GitHubRepositoryRepository gitHubRepositoryRepository;
    private final ProjectService projects;

    public Mono<GitHubRepository> syncRepository(String owner, String repoName, String projectId) {
        projects.getById(projectId).orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND, "Project not found"));
        String userToken = oauth.accessToken(organizations.currentUserId());
        return Mono.fromCallable(() -> {
            try {
                log.debug("Syncing repository: {}/{}", owner, repoName);
                GHRepository ghRepo = new org.kohsuke.github.GitHubBuilder().withEndpoint(apiBase).withOAuthToken(userToken).build().getRepository(owner + "/" + repoName);
                
                GitHubRepository repository = new GitHubRepository();
                repository.setGithubRepoId(String.valueOf(ghRepo.getId()));
                repository.setName(ghRepo.getName());
                repository.setFullName(ghRepo.getFullName());
                repository.setDescription(ghRepo.getDescription());
                repository.setHtmlUrl(ghRepo.getHtmlUrl().toString());
                repository.setCloneUrl(ghRepo.getHttpTransportUrl());
                repository.setSshUrl(ghRepo.getSshUrl());
                repository.setDefaultBranch(ghRepo.getDefaultBranch());
                repository.setLanguage(ghRepo.getLanguage());
                repository.setStargazersCount(ghRepo.getStargazersCount());
                repository.setForksCount(ghRepo.getForksCount());
                repository.setOpenIssuesCount(ghRepo.getOpenIssueCount());
                repository.setSize(ghRepo.getSize());
                repository.setPrivate(ghRepo.isPrivate());
                repository.setHasIssues(ghRepo.hasIssues());
                repository.setHasProjects(ghRepo.hasProjects());
                repository.setHasWiki(ghRepo.hasWiki());
                repository.setArchived(ghRepo.isArchived());
                repository.setDisabled(ghRepo.isDisabled());
                
                repository.setOwnerId(String.valueOf(ghRepo.getOwner().getId()));
                repository.setOwnerLogin(ghRepo.getOwner().getLogin());
                repository.setOwnerType(ghRepo.getOwner().getType());
                repository.setProjectId(projectId);
                
                if (ghRepo.getCreatedAt() != null) {
                    repository.setCreatedAt(ghRepo.getCreatedAt().toInstant()
                        .atZone(ZoneId.systemDefault()).toLocalDateTime());
                }
                if (ghRepo.getUpdatedAt() != null) {
                    repository.setUpdatedAt(ghRepo.getUpdatedAt().toInstant()
                        .atZone(ZoneId.systemDefault()).toLocalDateTime());
                }
                if (ghRepo.getPushedAt() != null) {
                    repository.setPushedAt(ghRepo.getPushedAt().toInstant()
                        .atZone(ZoneId.systemDefault()).toLocalDateTime());
                }
                repository.setLastSyncAt(LocalDateTime.now());

                GitHubRepository saved = gitHubRepositoryRepository.save(repository);
                log.info("Repository synced successfully: {}", saved.getFullName());
                return saved;
            } catch (IOException e) {
                log.error("Failed to sync repository {}/{}: {}", owner, repoName, e.getMessage());
                throw new RuntimeException("Failed to sync repository: " + e.getMessage(), e);
            }
        });
    }

    public Flux<GitHubCommit> getCommits(String owner, String repoName, String branch, int limit) {
        return repositoryClient(owner, repoName)
            .get()
            .uri("/repos/{owner}/{repo}/commits?sha={branch}&per_page={limit}", owner, repoName, branch, limit)
            .retrieve()
            .bodyToFlux(JsonNode.class)
            .map(this::mapToGitHubCommit);
    }

    public Flux<GitHubPullRequest> getPullRequests(String owner, String repoName, String state) {
        return repositoryClient(owner, repoName)
            .get()
            .uri("/repos/{owner}/{repo}/pulls?state={state}&per_page=50", owner, repoName, state)
            .retrieve()
            .bodyToFlux(JsonNode.class)
            .map(this::mapToGitHubPullRequest);
    }

    public Mono<JsonNode> getRepositoryStats(String owner, String repoName) {
        return repositoryClient(owner, repoName)
            .get()
            .uri("/repos/{owner}/{repo}/stats/contributors", owner, repoName)
            .retrieve()
            .bodyToMono(JsonNode.class);
    }

    public Mono<JsonNode> getLanguagesStats(String owner, String repoName) {
        return repositoryClient(owner, repoName)
            .get()
            .uri("/repos/{owner}/{repo}/languages", owner, repoName)
            .retrieve()
            .bodyToMono(JsonNode.class);
    }

    public Flux<JsonNode> getIssues(String owner, String repoName, String state) {
        return repositoryClient(owner, repoName)
            .get()
            .uri("/repos/{owner}/{repo}/issues?state={state}&per_page=50", owner, repoName, state)
            .retrieve()
            .bodyToFlux(JsonNode.class);
    }

    public Flux<JsonNode> getBranches(String owner, String repoName) {
        return repositoryClient(owner, repoName)
            .get()
            .uri("/repos/{owner}/{repo}/branches", owner, repoName)
            .retrieve()
            .bodyToFlux(JsonNode.class);
    }

    public Mono<JsonNode> createWebhook(String owner, String repoName, String webhookUrl) {
        java.net.URI destination;
        try { destination = java.net.URI.create(webhookUrl); }
        catch (IllegalArgumentException error) { throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Invalid webhook URL"); }
        if (!"https".equals(destination.getScheme()) || destination.getHost() == null || destination.getUserInfo() != null)
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Webhooks require an HTTPS destination");
        var requestBody = java.util.Map.of("name", "web", "active", true, "events", java.util.List.of("push", "pull_request", "issues"),
                "config", java.util.Map.of("url", webhookUrl, "content_type", "json"));

        return repositoryClient(owner, repoName)
            .post()
            .uri("/repos/{owner}/{repo}/hooks", owner, repoName)
            .bodyValue(requestBody)
            .retrieve()
            .bodyToMono(JsonNode.class);
    }

    private GitHubCommit mapToGitHubCommit(JsonNode commitNode) {
        GitHubCommit commit = new GitHubCommit();
        commit.setSha(commitNode.get("sha").asText());
        
        JsonNode commitData = commitNode.get("commit");
        commit.setMessage(commitData.get("message").asText());
        
        JsonNode author = commitData.get("author");
        commit.setAuthorName(author.get("name").asText());
        commit.setAuthorEmail(author.get("email").asText());
        commit.setAuthorDate(LocalDateTime.parse(author.get("date").asText().replace("Z", "")));
        
        JsonNode committer = commitData.get("committer");
        commit.setCommitterName(committer.get("name").asText());
        commit.setCommitterEmail(committer.get("email").asText());
        commit.setCommitterDate(LocalDateTime.parse(committer.get("date").asText().replace("Z", "")));
        
        if (commitNode.has("author") && commitNode.get("author") != null) {
            commit.setAuthorUsername(commitNode.get("author").get("login").asText());
        }
        
        commit.setHtmlUrl(commitNode.get("html_url").asText());
        commit.setApiUrl(commitNode.get("url").asText());
        commit.setCreatedAt(LocalDateTime.now());
        
        return commit;
    }

    private GitHubPullRequest mapToGitHubPullRequest(JsonNode prNode) {
        GitHubPullRequest pr = new GitHubPullRequest();
        pr.setGithubPrId(prNode.get("id").asText());
        pr.setNumber(prNode.get("number").asInt());
        pr.setTitle(prNode.get("title").asText());
        pr.setBody(prNode.get("body") != null ? prNode.get("body").asText() : "");
        pr.setState(prNode.get("state").asText());
        pr.setDraft(prNode.get("draft").asBoolean());
        
        JsonNode user = prNode.get("user");
        pr.setAuthorUsername(user.get("login").asText());
        
        JsonNode head = prNode.get("head");
        pr.setHeadBranch(head.get("ref").asText());
        pr.setHeadSha(head.get("sha").asText());
        
        JsonNode base = prNode.get("base");
        pr.setBaseBranch(base.get("ref").asText());
        pr.setBaseSha(base.get("sha").asText());
        
        pr.setMergeable(prNode.get("mergeable") != null ? prNode.get("mergeable").asBoolean() : false);
        pr.setMerged(prNode.get("merged").asBoolean());
        
        if (prNode.has("merged_by") && prNode.get("merged_by") != null) {
            pr.setMergedBy(prNode.get("merged_by").get("login").asText());
        }
        
        pr.setHtmlUrl(prNode.get("html_url").asText());
        pr.setApiUrl(prNode.get("url").asText());
        
        pr.setCreatedAt(LocalDateTime.parse(prNode.get("created_at").asText().replace("Z", "")));
        pr.setUpdatedAt(LocalDateTime.parse(prNode.get("updated_at").asText().replace("Z", "")));
        
        if (prNode.has("closed_at") && prNode.get("closed_at") != null) {
            pr.setClosedAt(LocalDateTime.parse(prNode.get("closed_at").asText().replace("Z", "")));
        }
        
        return pr;
    }

    public List<GitHubRepository> getRepositoriesByProjectId(String projectId) {
        projects.getById(projectId).orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND, "Project not found"));
        return gitHubRepositoryRepository.findByProjectId(projectId);
    }

    public GitHubRepository getRepositoryById(String repositoryId) {
        return gitHubRepositoryRepository.findById(repositoryId).filter(repo -> projects.getById(repo.getProjectId()).isPresent()).orElse(null);
    }

    public void deleteRepository(String repositoryId) {
        if (getRepositoryById(repositoryId) == null) throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND);
        gitHubRepositoryRepository.deleteById(repositoryId);
    }

    private WebClient repositoryClient(String owner, String repoName) {
        requireCurrentRepository(owner, repoName);
        String userToken = oauth.accessToken(organizations.currentUserId());
        return WebClient.builder().baseUrl(apiBase).defaultHeader("Authorization", "Bearer " + userToken)
                .defaultHeader("Accept", "application/vnd.github+json").build();
    }

    public void requireCurrentRepository(String owner, String repoName) {
        boolean found = gitHubRepositoryRepository.findAll().stream().anyMatch(repo ->
                (owner + "/" + repoName).equalsIgnoreCase(repo.getFullName()) && projects.getById(repo.getProjectId()).isPresent());
        if (!found) throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND, "Repository not linked to this organization");
    }
}
