package com.HiCaptain.demo.service;
import com.HiCaptain.demo.model.GitHubRepository;
import com.HiCaptain.demo.repository.GitHubRepositoryRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;
import java.util.List;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.bson.Document;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.mongodb.core.MongoTemplate;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
class GitHubWebhookServiceTest {
    private static final String SECRET = "webhook-test-secret-at-least-32-characters";
    private String signature(byte[] body) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256"); mac.init(new SecretKeySpec(SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        return "sha256=" + HexFormat.of().formatHex(mac.doFinal(body));
    }
    @Test void invalidSignatureCannotReachPersistence() {
        var mongo = mock(MongoTemplate.class); var repos = mock(GitHubRepositoryRepository.class);
        var service = new GitHubWebhookService(SECRET, mongo, repos, new ObjectMapper());
        assertThrows(Exception.class, () -> service.receive("push", "sha256=forged", "{}".getBytes()));
        verifyNoInteractions(mongo, repos);
    }
    @Test void validPushPersistsLinkedProjectCommitsAndDuplicateBodiesAreIgnored() throws Exception {
        var mongo = mock(MongoTemplate.class); var repos = mock(GitHubRepositoryRepository.class);
        var repo = new GitHubRepository(); repo.setId("repository"); repo.setProjectId("project");
        when(repos.findByFullName("team/repo")).thenReturn(List.of(repo));
        when(mongo.insert(any(Document.class), eq("github_webhook_deliveries"))).thenAnswer(call -> call.getArgument(0)).thenThrow(new DuplicateKeyException("already processed"));
        when(mongo.findById(anyString(), eq(Document.class), eq("github_webhook_deliveries"))).thenReturn(new Document("processed", true));
        var service = new GitHubWebhookService(SECRET, mongo, repos, new ObjectMapper());
        byte[] body = "{\"repository\":{\"full_name\":\"team/repo\"},\"commits\":[{\"id\":\"sha\",\"message\":\"Change\"}]}".getBytes(StandardCharsets.UTF_8);
        service.receive("push", signature(body), body); service.receive("push", signature(body), body);
        verify(mongo, times(1)).upsert(any(), any(), eq("github_commits"));
        verify(repos, times(1)).findByFullName("team/repo");
        assertThrows(Exception.class, () -> service.receive("push", signature(body), "{\"changed\":true}".getBytes()));
    }
}
