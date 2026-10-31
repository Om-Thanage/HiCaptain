package com.HiCaptain.demo.service;
import com.HiCaptain.demo.repository.GitHubRepositoryRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.HexFormat;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.bson.Document;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
@Service
public class GitHubWebhookService {
    private final String secret;
    private final MongoTemplate mongo;
    private final GitHubRepositoryRepository repos;
    private final ObjectMapper json;
    public GitHubWebhookService(@Value("${github.webhook.secret:}") String secret, MongoTemplate mongo, GitHubRepositoryRepository repos, ObjectMapper json) {
        this.secret = secret; this.mongo = mongo; this.repos = repos; this.json = json;
    }
    public void receive(String event, String signature, byte[] body) {
        if (secret.length() < 32) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Configure GITHUB_WEBHOOK_SECRET");
        try {
            Mac mac = Mac.getInstance("HmacSHA256"); mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            String expected = "sha256=" + HexFormat.of().formatHex(mac.doFinal(body));
            if (!MessageDigest.isEqual(expected.getBytes(StandardCharsets.US_ASCII), signature.getBytes(StandardCharsets.US_ASCII)))
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid webhook signature");
            if (!java.util.Set.of("push", "pull_request", "issues", "ping").contains(event)) return;
            JsonNode payload = json.readTree(body);
            String fullName = payload.path("repository").path("full_name").asText();
            if (fullName.isBlank() && !event.equals("ping")) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing repository");
            String id = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest((event + ":" + new String(body, StandardCharsets.UTF_8)).getBytes(StandardCharsets.UTF_8)));
            Document delivery = new Document("_id", id).append("event", event).append("processed", false).append("receivedAt", java.util.Date.from(Instant.now()));
            try { mongo.insert(delivery, "github_webhook_deliveries"); }
            catch (DuplicateKeyException duplicate) {
                Document old = mongo.findById(id, Document.class, "github_webhook_deliveries");
                if (old != null && Boolean.TRUE.equals(old.getBoolean("processed"))) return;
            }
            for (var repo : repos.findByFullName(fullName)) {
                if (event.equals("push")) for (JsonNode commit : payload.path("commits")) {
                    String sha = commit.path("id").asText(); if (sha.isBlank()) continue;
                    var values = new Update().setOnInsert("projectId", repo.getProjectId()).setOnInsert("repositoryId", repo.getId())
                            .setOnInsert("repositoryName", fullName).setOnInsert("sha", sha).setOnInsert("message", commit.path("message").asText())
                            .setOnInsert("authorName", commit.path("author").path("name").asText()).setOnInsert("authorUsername", commit.path("author").path("username").asText())
                            .setOnInsert("htmlUrl", commit.path("url").asText()).setOnInsert("branch", payload.path("ref").asText().replaceFirst("^refs/heads/", ""));
                    if (commit.hasNonNull("timestamp")) values.setOnInsert("authorDate", LocalDateTime.ofInstant(Instant.parse(commit.path("timestamp").asText()), ZoneOffset.UTC));
                    mongo.upsert(Query.query(Criteria.where("_id").is(repo.getId() + ":" + sha)), values, "github_commits");
                }
                if (event.equals("pull_request") || event.equals("issues")) {
                    JsonNode item = payload.path(event.equals("issues") ? "issue" : "pull_request");
                    if (!item.hasNonNull("id") || !item.hasNonNull("updated_at")) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Incomplete webhook event");
                    LocalDateTime updated = LocalDateTime.ofInstant(Instant.parse(item.path("updated_at").asText()), ZoneOffset.UTC);
                    var update = new Update().set("projectId", repo.getProjectId()).set("repositoryId", repo.getId()).set("repositoryName", fullName)
                            .set("githubPrId", item.path("id").asText()).set("number", item.path("number").asInt()).set("title", item.path("title").asText())
                            .set("state", item.path("merged").asBoolean() ? "merged" : item.path("state").asText()).set("htmlUrl", item.path("html_url").asText())
                            .set("body", item.path("body").asText()).set("authorUsername", item.path("user").path("login").asText()).set("updatedAt", updated);
                    String key = repo.getId() + ":" + item.path("id").asText();
                    Query current = Query.query(Criteria.where("_id").is(key)).addCriteria(new Criteria().orOperator(Criteria.where("updatedAt").lte(updated), Criteria.where("updatedAt").exists(false)));
                    try { mongo.upsert(current, update, event.equals("issues") ? "github_issues" : "github_pull_requests"); }
                    catch (DuplicateKeyException olderEvent) { /* Newer state already exists; never overwrite it with a delayed event. */ }
                }
            }
            mongo.updateFirst(Query.query(Criteria.where("_id").is(id)), new Update().set("processed", true), "github_webhook_deliveries");
        } catch (ResponseStatusException error) { throw error; }
        catch (java.io.IOException | java.security.GeneralSecurityException | java.time.format.DateTimeParseException invalid) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid webhook payload");
        }
    }
}
