package com.HiCaptain.demo.service;

import com.HiCaptain.demo.repository.GoogleWorkspaceConnectionRepository;
import java.io.IOException;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class GoogleCalendarServiceTest {
    private final GoogleWorkspaceConnectionRepository connections = mock(GoogleWorkspaceConnectionRepository.class);
    private final JwtService jwt = mock(JwtService.class);
    private static final String TOKEN_KEY = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
    private static final String CALLBACK = "https://example.com/api/google-calendar/auth/callback";

    @Test void oauthUrlUsesEnvironmentCredentials() throws IOException {
        when(jwt.generateOAuthState("user-1", "google")).thenReturn("signed-state");
        var service = new GoogleCalendarService(connections, jwt, "client-id.apps.googleusercontent.com", "private-secret", TOKEN_KEY, CALLBACK);

        String url = service.getAuthorizationUrl("user-1");

        assertTrue(url.contains("client_id=client-id.apps.googleusercontent.com"));
        assertTrue(URLDecoder.decode(url, StandardCharsets.UTF_8).contains("redirect_uri=" + CALLBACK));
        assertFalse(url.contains("private-secret"));
    }

    @Test void missingEnvironmentCredentialsFailClearly() {
        var service = new GoogleCalendarService(connections, jwt, "", "", TOKEN_KEY, CALLBACK);

        IOException error = assertThrows(IOException.class, () -> service.getAuthorizationUrl("user-1"));

        assertTrue(error.getMessage().contains("GOOGLE_CLIENT_ID"));
        assertTrue(error.getMessage().contains("GOOGLE_CLIENT_SECRET"));
    }
}
