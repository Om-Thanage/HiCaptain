package com.HiCaptain.demo.service;
import com.HiCaptain.demo.model.GitHubConnection;
import com.HiCaptain.demo.repository.GitHubConnectionRepository;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
class GitHubTokenStorageTest {
    @Test void startupMigratesLegacyTokensWithoutRetainingPlaintext() {
        var repository = mock(GitHubConnectionRepository.class);
        var connection = new GitHubConnection(); connection.setAccessToken("legacy-token");
        when(repository.findAll()).thenReturn(List.of(connection));
        var service = new GitHubOAuthService();
        var cipher = new ProviderTokenCipher("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=");
        ReflectionTestUtils.setField(service, "connectionRepository", repository);
        ReflectionTestUtils.setField(service, "tokenCipher", cipher);
        service.encryptLegacyConnections();
        verify(repository).save(connection);
        assertTrue(cipher.isEncrypted(connection.getAccessToken()));
        assertEquals("legacy-token", cipher.decrypt(connection.getAccessToken()));
    }
}
