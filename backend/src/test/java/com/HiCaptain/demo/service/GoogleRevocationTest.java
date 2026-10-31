package com.HiCaptain.demo.service;
import com.HiCaptain.demo.model.GoogleWorkspaceConnection;
import com.HiCaptain.demo.repository.GoogleWorkspaceConnectionRepository;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
class GoogleRevocationTest {
    @Test void failedProviderRevocationRetainsTheConnectionForRetry() throws Exception {
        var status = new AtomicInteger(503); var server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/revoke", exchange -> { exchange.getRequestBody().readAllBytes(); exchange.sendResponseHeaders(status.get(), -1); exchange.close(); });
        server.start();
        try {
            var connections = mock(GoogleWorkspaceConnectionRepository.class);
            var service = new GoogleCalendarService(connections, mock(JwtService.class), "id", "secret", "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=", "https://example.com/callback");
            String encrypted = ReflectionTestUtils.invokeMethod(service, "encrypt", "private-refresh-token");
            when(connections.findById("user")).thenReturn(Optional.of(new GoogleWorkspaceConnection("user", encrypted)));
            ReflectionTestUtils.setField(service, "revocationUri", "http://127.0.0.1:" + server.getAddress().getPort() + "/revoke");
            assertThrows(java.io.IOException.class, () -> service.revokeAuthorization("user")); verify(connections, never()).deleteById(any());
            status.set(200); service.revokeAuthorization("user"); verify(connections).deleteById("user");
        } finally { server.stop(0); }
    }
}
