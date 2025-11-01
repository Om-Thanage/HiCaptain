package com.HiCaptain.demo.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
@ConditionalOnClass(name = "org.kohsuke.github.GitHub")
public class GitHubConfig {

    @Value("${github.token:}")
    private String githubToken;

    @Value("${github.api.base-url:https://api.github.com}")
    private String githubApiBaseUrl;

    @Bean
    @ConditionalOnClass(name = "org.kohsuke.github.GitHub")
    public Object gitHub() {
        try {
            Class<?> gitHubClass = Class.forName("org.kohsuke.github.GitHub");
            Class<?> gitHubBuilderClass = Class.forName("org.kohsuke.github.GitHubBuilder");
            
            if (githubToken != null && !githubToken.isEmpty()) {
                Object builder = gitHubBuilderClass.getDeclaredConstructor().newInstance();
                Object builderWithToken = gitHubBuilderClass.getMethod("withOAuthToken", String.class).invoke(builder, githubToken);
                return gitHubBuilderClass.getMethod("build").invoke(builderWithToken);
            }
            // For public repositories without authentication
            return gitHubClass.getMethod("connectAnonymously").invoke(null);
        } catch (Exception e) {
            System.err.println("GitHub API not available: " + e.getMessage());
            return null;
        }
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