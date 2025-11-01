package com.HiCaptain.demo.service;

import com.HiCaptain.demo.model.GitHubRepository;
import com.HiCaptain.demo.model.GitHubCommit;
import com.HiCaptain.demo.model.GitHubPullRequest;
import com.HiCaptain.demo.repository.GitHubRepositoryRepository;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.stream.Collectors;

@Service
@ConditionalOnClass(name = "org.kohsuke.github.GitHub")
public class GitHubService {

    @Autowired(required = false)
    private Object gitHub;

    @Autowired
    private WebClient gitHubWebClient;

    @Autowired
    private GitHubRepositoryRepository gitHubRepositoryRepository;

    public Mono<GitHubRepository> syncRepository(String owner, String repoName, String projectId) {
        return Mono.fromCallable(() -> {
            if (gitHub == null) {
                throw new RuntimeException("GitHub integration is not available");
            }
            
            try {
                // Use reflection to call GitHub methods since we can't import the class
                Object ghRepo = gitHub.getClass().getMethod("getRepository", String.class)
                    .invoke(gitHub, owner + "/" + repoName);
                
                GitHubRepository repository = new GitHubRepository();
                repository.setGithubRepoId(String.valueOf(ghRepo.getClass().getMethod("getId").invoke(ghRepo)));
                repository.setName((String) ghRepo.getClass().getMethod("getName").invoke(ghRepo));
                repository.setFullName((String) ghRepo.getClass().getMethod("getFullName").invoke(ghRepo));
                repository.setDescription((String) ghRepo.getClass().getMethod("getDescription").invoke(ghRepo));
                repository.setHtmlUrl(ghRepo.getClass().getMethod("getHtmlUrl").invoke(ghRepo).toString());
                repository.setCloneUrl((String) ghRepo.getClass().getMethod("getHttpTransportUrl").invoke(ghRepo));
                repository.setSshUrl((String) ghRepo.getClass().getMethod("getSshUrl").invoke(ghRepo));
                repository.setDefaultBranch((String) ghRepo.getClass().getMethod("getDefaultBranch").invoke(ghRepo));
                repository.setLanguage((String) ghRepo.getClass().getMethod("getLanguage").invoke(ghRepo));
                repository.setStargazersCount((Integer) ghRepo.getClass().getMethod("getStargazersCount").invoke(ghRepo));
                repository.setForksCount((Integer) ghRepo.getClass().getMethod("getForksCount").invoke(ghRepo));
                repository.setOpenIssuesCount((Integer) ghRepo.getClass().getMethod("getOpenIssueCount").invoke(ghRepo));
                repository.setSize((Integer) ghRepo.getClass().getMethod("getSize").invoke(ghRepo));
                repository.setPrivate((Boolean) ghRepo.getClass().getMethod("isPrivate").invoke(ghRepo));
                repository.setHasIssues((Boolean) ghRepo.getClass().getMethod("hasIssues").invoke(ghRepo));
                repository.setHasProjects((Boolean) ghRepo.getClass().getMethod("hasProjects").invoke(ghRepo));
                repository.setHasWiki((Boolean) ghRepo.getClass().getMethod("hasWiki").invoke(ghRepo));
                repository.setArchived((Boolean) ghRepo.getClass().getMethod("isArchived").invoke(ghRepo));
                repository.setDisabled((Boolean) ghRepo.getClass().getMethod("isDisabled").invoke(ghRepo));
                
                Object repoOwner = ghRepo.getClass().getMethod("getOwner").invoke(ghRepo);
                repository.setOwnerId(String.valueOf(repoOwner.getClass().getMethod("getId").invoke(repoOwner)));
                repository.setOwnerLogin((String) repoOwner.getClass().getMethod("getLogin").invoke(repoOwner));
                repository.setOwnerType((String) repoOwner.getClass().getMethod("getType").invoke(repoOwner));
                repository.setProjectId(projectId);
                
                Object createdAt = ghRepo.getClass().getMethod("getCreatedAt").invoke(ghRepo);
                Object updatedAt = ghRepo.getClass().getMethod("getUpdatedAt").invoke(ghRepo);
                Object pushedAt = ghRepo.getClass().getMethod("getPushedAt").invoke(ghRepo);
                
                if (createdAt != null) {
                    repository.setCreatedAt(((java.util.Date) createdAt).toInstant().atZone(ZoneId.systemDefault()).toLocalDateTime());
                }
                if (updatedAt != null) {
                    repository.setUpdatedAt(((java.util.Date) updatedAt).toInstant().atZone(ZoneId.systemDefault()).toLocalDateTime());
                }
                if (pushedAt != null) {
                    repository.setPushedAt(((java.util.Date) pushedAt).toInstant().atZone(ZoneId.systemDefault()).toLocalDateTime());
                }
                repository.setLastSyncAt(LocalDateTime.now());

                return gitHubRepositoryRepository.save(repository);
            } catch (Exception e) {
                throw new RuntimeException("Failed to sync repository: " + e.getMessage(), e);
            }
        });
    }

    public Flux<GitHubCommit> getCommits(String owner, String repoName, String branch, int limit) {
        return gitHubWebClient
            .get()
            .uri("/repos/{owner}/{repo}/commits?sha={branch}&per_page={limit}", owner, repoName, branch, limit)
            .retrieve()
            .bodyToFlux(JsonNode.class)
            .map(this::mapToGitHubCommit);
    }

    public Flux<GitHubPullRequest> getPullRequests(String owner, String repoName, String state) {
        return gitHubWebClient
            .get()
            .uri("/repos/{owner}/{repo}/pulls?state={state}&per_page=50", owner, repoName, state)
            .retrieve()
            .bodyToFlux(JsonNode.class)
            .map(this::mapToGitHubPullRequest);
    }

    public Mono<JsonNode> getRepositoryStats(String owner, String repoName) {
        return gitHubWebClient
            .get()
            .uri("/repos/{owner}/{repo}/stats/contributors", owner, repoName)
            .retrieve()
            .bodyToMono(JsonNode.class);
    }

    public Mono<JsonNode> getLanguagesStats(String owner, String repoName) {
        return gitHubWebClient
            .get()
            .uri("/repos/{owner}/{repo}/languages", owner, repoName)
            .retrieve()
            .bodyToMono(JsonNode.class);
    }

    public Flux<JsonNode> getIssues(String owner, String repoName, String state) {
        return gitHubWebClient
            .get()
            .uri("/repos/{owner}/{repo}/issues?state={state}&per_page=50", owner, repoName, state)
            .retrieve()
            .bodyToFlux(JsonNode.class);
    }

    public Flux<JsonNode> getBranches(String owner, String repoName) {
        return gitHubWebClient
            .get()
            .uri("/repos/{owner}/{repo}/branches", owner, repoName)
            .retrieve()
            .bodyToFlux(JsonNode.class);
    }

    public Mono<JsonNode> createWebhook(String owner, String repoName, String webhookUrl) {
        String requestBody = String.format("""
            {
                "name": "web",
                "active": true,
                "events": ["push", "pull_request", "issues", "commit_comment"],
                "config": {
                    "url": "%s",
                    "content_type": "json"
                }
            }
            """, webhookUrl);

        return gitHubWebClient
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
        return gitHubRepositoryRepository.findByProjectId(projectId);
    }

    public GitHubRepository getRepositoryById(String repositoryId) {
        return gitHubRepositoryRepository.findById(repositoryId).orElse(null);
    }

    public void deleteRepository(String repositoryId) {
        gitHubRepositoryRepository.deleteById(repositoryId);
    }
}