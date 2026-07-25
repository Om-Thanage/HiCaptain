package com.HiCaptain.demo.config;

import org.kohsuke.github.GitHub;
import org.kohsuke.github.GitHubBuilder;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

import java.io.IOException;

@Configuration
public class GitHubConfig {

    @Value("${github.token:}")
    private String githubToken;

    @Value("${github.api.base-url:https://api.github.com}")
    private String githubApiBaseUrl;

    @Bean
    public GitHub gitHub() throws IOException {
        if (githubToken != null && !githubToken.isEmpty()) {
            return new GitHubBuilder()
                .withOAuthToken(githubToken)
                .build();
        }
        // For public repositories without authentication
        return GitHub.connectAnonymously();
    }

    @Bean
    public WebClient gitHubWebClient() {
        WebClient.Builder builder = WebClient.builder()
            .baseUrl(githubApiBaseUrl)
            .defaultHeader("Accept", "application/vnd.github.v3+json")
            .defaultHeader("User-Agent", "HiCaptain-App");

        if (githubToken != null && !githubToken.isEmpty()) {
            builder.defaultHeader("Authorization", "token " + githubToken);
        }

        return builder.build();
    }
}