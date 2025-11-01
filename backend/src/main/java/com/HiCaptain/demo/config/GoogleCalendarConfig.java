package com.HiCaptain.demo.config;

import com.google.api.client.googleapis.auth.oauth2.GoogleAuthorizationCodeFlow;
import com.google.api.client.googleapis.auth.oauth2.GoogleClientSecrets;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.JsonFactory;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.services.calendar.Calendar;
import com.google.api.services.calendar.CalendarScopes;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Conditional;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Condition;
import org.springframework.context.annotation.ConditionContext;
import org.springframework.core.type.AnnotatedTypeMetadata;

import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.security.GeneralSecurityException;
import java.util.Collections;
import java.util.List;

@Configuration
@ConditionalOnClass(name = "com.google.api.services.calendar.Calendar")
public class GoogleCalendarConfig {

    private static final JsonFactory JSON_FACTORY = GsonFactory.getDefaultInstance();
    private static final List<String> SCOPES = Collections.singletonList(CalendarScopes.CALENDAR);

    @Value("${google.calendar.credentials.file-path:/credentials.json}")
    private String credentialsFilePath;

    // Custom condition to check if valid Google credentials exist
    public static class ValidGoogleCredentialsCondition implements Condition {
        @Override
        public boolean matches(ConditionContext context, AnnotatedTypeMetadata metadata) {
            try {
                InputStream in = GoogleCalendarConfig.class.getResourceAsStream("/credentials.json");
                if (in == null) {
                    System.err.println("Warning: Google Calendar credentials file not found: /credentials.json");
                    return false;
                }
                
                GoogleClientSecrets secrets = GoogleClientSecrets.load(GsonFactory.getDefaultInstance(), new InputStreamReader(in));
                // Check if client ID is properly configured (not placeholder)
                if (secrets.getDetails().getClientId() == null || 
                    secrets.getDetails().getClientId().startsWith("YOUR_GOOGLE_CLIENT_ID")) {
                    System.err.println("Warning: Google Calendar credentials contain placeholder values");
                    return false;
                }
                
                return true;
            } catch (Exception e) {
                System.err.println("Warning: Could not validate Google Calendar credentials: " + e.getMessage());
                return false;
            }
        }
    }

    @Bean
    @Conditional(ValidGoogleCredentialsCondition.class)
    public NetHttpTransport httpTransport() throws GeneralSecurityException, IOException {
        return GoogleNetHttpTransport.newTrustedTransport();
    }

    @Bean
    @Conditional(ValidGoogleCredentialsCondition.class)
    public JsonFactory jsonFactory() {
        return JSON_FACTORY;
    }

    @Bean
    @Conditional(ValidGoogleCredentialsCondition.class)
    public GoogleClientSecrets googleClientSecrets() throws IOException {
        InputStream in = GoogleCalendarConfig.class.getResourceAsStream(credentialsFilePath);
        if (in == null) {
            throw new IOException("Google Calendar credentials file not found: " + credentialsFilePath);
        }
        return GoogleClientSecrets.load(JSON_FACTORY, new InputStreamReader(in));
    }

    @Bean
    @Conditional(ValidGoogleCredentialsCondition.class)
    public GoogleAuthorizationCodeFlow googleAuthorizationCodeFlow(
            NetHttpTransport httpTransport,
            GoogleClientSecrets clientSecrets) throws IOException {
        return new GoogleAuthorizationCodeFlow.Builder(
                httpTransport, JSON_FACTORY, clientSecrets, SCOPES)
                .setAccessType("offline")
                .setApprovalPrompt("force")
                .build();
    }
}