package com.HiCaptain.demo.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import lombok.Data;

@Configuration
@ConfigurationProperties(prefix = "github.oauth")
@Data
public class GitHubOAuthConfig {
    
    private String clientId;
    private String clientSecret;
    private String redirectUri;
    private String[] scopes = {"repo", "read:user", "user:email"};
    private String authorizationUrl = "https://github.com/login/oauth/authorize";
    private String tokenUrl = "https://github.com/login/oauth/access_token";
    private String userUrl = "https://api.github.com/user";
}