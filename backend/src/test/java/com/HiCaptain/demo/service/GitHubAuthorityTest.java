package com.HiCaptain.demo.service;
import com.HiCaptain.demo.model.GitHubRepository;
import com.HiCaptain.demo.model.Project;
import com.HiCaptain.demo.repository.GitHubRepositoryRepository;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
class GitHubAuthorityTest {
    @Test void unlinkedRepositoriesAreRejectedBeforeLoadingCredentials() {
        var repos = mock(GitHubRepositoryRepository.class); var projects = mock(ProjectService.class);
        var oauth = mock(GitHubOAuthService.class); var orgs = mock(OrganizationService.class);
        var service = new GitHubService(oauth, orgs, repos, projects);
        when(repos.findAll()).thenReturn(List.of());
        assertThrows(Exception.class, () -> service.getIssues("private", "repo", "open"));
        verifyNoInteractions(oauth);
    }
    @Test void linkedRepositoryUsesTheCurrentUsersConnection() throws Exception {
        var auth = new AtomicReference<String>();
        var server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/repos/team/project/issues", exchange -> {
            auth.set(exchange.getRequestHeaders().getFirst("Authorization"));
            byte[] body = "[]".getBytes(); exchange.getResponseHeaders().add("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, body.length); exchange.getResponseBody().write(body); exchange.close();
        }); server.start();
        try {
            var repos = mock(GitHubRepositoryRepository.class); var projects = mock(ProjectService.class);
            var oauth = mock(GitHubOAuthService.class); var orgs = mock(OrganizationService.class);
            var repository = new GitHubRepository(); repository.setFullName("team/project"); repository.setProjectId("project");
            when(repos.findAll()).thenReturn(List.of(repository)); when(projects.getById("project")).thenReturn(Optional.of(new Project()));
            when(orgs.currentUserId()).thenReturn("member"); when(oauth.accessToken("member")).thenReturn("member-token");
            var service = new GitHubService(oauth, orgs, repos, projects);
            ReflectionTestUtils.setField(service, "apiBase", "http://127.0.0.1:" + server.getAddress().getPort());
            service.getIssues("team", "project", "open").collectList().block();
            assertEquals("Bearer member-token", auth.get());
        } finally { server.stop(0); }
    }
}
