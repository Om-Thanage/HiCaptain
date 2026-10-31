package com.HiCaptain.demo.service;

import com.HiCaptain.demo.config.GitHubOAuthConfig;
import com.HiCaptain.demo.model.GitHubConnection;
import com.HiCaptain.demo.repository.GitHubConnectionRepository;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.LocalDateTime;
import java.util.*;

@Service
public class GitHubOAuthService {

    @Autowired
    private GitHubOAuthConfig oauthConfig;

    @Autowired
    private GitHubConnectionRepository connectionRepository;

    @Autowired
    private WebClient.Builder webClientBuilder;
    @Autowired private JwtService jwtService;
    @Autowired private ProviderTokenCipher tokenCipher;

    @org.springframework.context.event.EventListener(org.springframework.boot.context.event.ApplicationReadyEvent.class)
    public void encryptLegacyConnections() {
        for (GitHubConnection connection : connectionRepository.findAll()) {
            String stored = connection.getAccessToken();
            if (stored != null && !stored.isBlank() && !tokenCipher.isEncrypted(stored)) {
                connection.setAccessToken(tokenCipher.encrypt(stored));
                connection.setRefreshToken(null); // Legacy refresh credentials were never supported by this integration.
                connectionRepository.save(connection);
            }
        }
    }

    /**
     * Step 1: Generate GitHub OAuth authorization URL (like Vercel's "Connect GitHub" button)
     */
    public String getAuthorizationUrl(String userId, String state) {
        // Check if OAuth is properly configured
        if (oauthConfig.getClientId() == null || oauthConfig.getClientId().startsWith("YOUR_")) {
            throw new RuntimeException("GitHub OAuth client ID not configured. Please set github.oauth.client-id in application.properties");
        }
        if (oauthConfig.getClientSecret() == null || oauthConfig.getClientSecret().startsWith("YOUR_")) {
            throw new RuntimeException("GitHub OAuth client secret not configured. Please set github.oauth.client-secret in application.properties");
        }
        
        return UriComponentsBuilder
                .fromUriString(oauthConfig.getAuthorizationUrl())
                .queryParam("client_id", oauthConfig.getClientId())
                .queryParam("redirect_uri", oauthConfig.getRedirectUri())
                .queryParam("scope", String.join(",", oauthConfig.getScopes()))
                .queryParam("state", state)
                .queryParam("allow_signup", "true")
                .build()
                .toUriString();
    }

    /**
     * Step 2: Handle the callback from GitHub OAuth (exchange code for token)
     */
    public GitHubConnection handleCallback(String code, String state) {
        try {
            // Parse state to get user ID
            String userId = jwtService.verifyOAuthState(state, "github");

            // Exchange authorization code for access token
            JsonNode tokenResponse = exchangeCodeForToken(code);
            String accessToken = tokenResponse.get("access_token").asText();
            String tokenType = tokenResponse.has("token_type") ? 
                tokenResponse.get("token_type").asText() : "bearer";
            String scope = tokenResponse.has("scope") ? 
                tokenResponse.get("scope").asText() : String.join(",", oauthConfig.getScopes());

            // Get user information from GitHub
            JsonNode userInfo = getUserInfo(accessToken);

            // Create or update GitHub connection
            GitHubConnection connection = createOrUpdateConnection(
                userId, accessToken, tokenType, scope.split(","), userInfo
            );

            // Fetch user's accessible repositories
            updateAccessibleRepositories(connection, accessToken);

            return connection;

        } catch (Exception e) {
            throw new RuntimeException("Failed to handle GitHub OAuth callback: " + e.getMessage(), e);
        }
    }

    /**
     * Step 3: Exchange authorization code for access token
     */
    private JsonNode exchangeCodeForToken(String code) {
        WebClient webClient = webClientBuilder.build();

        Map<String, String> requestBody = new HashMap<>();
        requestBody.put("client_id", oauthConfig.getClientId());
        requestBody.put("client_secret", oauthConfig.getClientSecret());
        requestBody.put("code", code);
        requestBody.put("redirect_uri", oauthConfig.getRedirectUri());

        return webClient.post()
                .uri(oauthConfig.getTokenUrl())
                .header("Accept", "application/json")
                .header("User-Agent", "HiCaptain-App")
                .bodyValue(requestBody)
                .retrieve()
                .bodyToMono(JsonNode.class)
                .block();
    }

    /**
     * Get GitHub user information
     */
    private JsonNode getUserInfo(String accessToken) {
        WebClient webClient = webClientBuilder.build();

        return webClient.get()
                .uri(oauthConfig.getUserUrl())
                .header("Authorization", "Bearer " + accessToken)
                .header("User-Agent", "HiCaptain-App")
                .header("Accept", "application/vnd.github.v3+json")
                .retrieve()
                .bodyToMono(JsonNode.class)
                .block();
    }

    /**
     * Create or update GitHub connection for user
     */
    private GitHubConnection createOrUpdateConnection(
            String userId, String accessToken, String tokenType, 
            String[] scopes, JsonNode userInfo) {

        Optional<GitHubConnection> existingConnection = 
            connectionRepository.findByUserIdAndActive(userId, true);

        GitHubConnection connection;
        if (existingConnection.isPresent()) {
            connection = existingConnection.get();
            connection.setLastUsedAt(LocalDateTime.now());
        } else {
            connection = new GitHubConnection();
            connection.setUserId(userId);
            connection.setConnectedAt(LocalDateTime.now());
            connection.setConnectionMethod("OAUTH");
        }

        // Update GitHub user information
        connection.setGithubUserId(userInfo.get("id").asText());
        connection.setGithubUsername(userInfo.get("login").asText());
        connection.setGithubEmail(userInfo.has("email") && !userInfo.get("email").isNull() ? 
            userInfo.get("email").asText() : null);
        connection.setGithubAvatarUrl(userInfo.get("avatar_url").asText());

        // Update token information
        connection.setAccessToken(tokenCipher.encrypt(accessToken));
        connection.setTokenType(tokenType);
        connection.setScopes(scopes);
        connection.setActive(true);
        connection.setLastSyncAt(LocalDateTime.now());

        return connectionRepository.save(connection);
    }

    /**
     * Fetch and update user's accessible repositories
     */
    private void updateAccessibleRepositories(GitHubConnection connection, String accessToken) {
        try {
            WebClient webClient = webClientBuilder.build();

            // Get user's repositories (both owned and collaborator repos)
            JsonNode repos = webClient.get()
                    .uri("https://api.github.com/user/repos?type=all&sort=updated&per_page=100")
                    .header("Authorization", "Bearer " + accessToken)
                    .header("User-Agent", "HiCaptain-App")
                    .header("Accept", "application/vnd.github.v3+json")
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .block();

            List<String> accessibleRepos = new ArrayList<>();
            if (repos != null && repos.isArray()) {
                for (JsonNode repo : repos) {
                    String fullName = repo.get("full_name").asText();
                    accessibleRepos.add(fullName);
                    
                    // Check if user has admin access (can manage webhooks)
                    JsonNode permissions = repo.get("permissions");
                    if (permissions != null && permissions.get("admin").asBoolean()) {
                        connection.setCanAccessPrivateRepos(true);
                    }
                }
            }

            connection.setAccessibleRepositories(accessibleRepos);
            connectionRepository.save(connection);

        } catch (Exception e) {
            System.err.println("Failed to update accessible repositories: " + e.getMessage());
        }
    }

    /**
     * Get user's GitHub connection
     */
    public Optional<GitHubConnection> getUserConnection(String userId) {
        return connectionRepository.findByUserIdAndActive(userId, true);
    }

    public String accessToken(String userId) {
        GitHubConnection connection = getUserConnection(userId).orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.CONFLICT, "Connect GitHub in Settings first"));
        String stored = connection.getAccessToken();
        if (stored == null || stored.isBlank()) throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.CONFLICT, "Reconnect GitHub");
        if (!tokenCipher.isEncrypted(stored)) {
            // Migrate existing connections on use; encryption failures never fall back to plaintext writes.
            connection.setAccessToken(tokenCipher.encrypt(stored));
            connectionRepository.save(connection);
            return stored;
        }
        return tokenCipher.decrypt(stored);
    }

    /**
     * Check if user has access to a specific repository
     */
    public boolean hasRepositoryAccess(String userId, String repositoryFullName) {
        Optional<GitHubConnection> connection = getUserConnection(userId);
        if (connection.isEmpty()) {
            return false;
        }

        GitHubConnection conn = connection.get();
        return conn.isCanAccessAllRepos() || 
               (conn.getAccessibleRepositories() != null && 
                conn.getAccessibleRepositories().contains(repositoryFullName));
    }

    /**
     * Disconnect GitHub account
     */
    public void disconnectGitHub(String userId) {
        Optional<GitHubConnection> connection = getUserConnection(userId);
        if (connection.isPresent()) {
            GitHubConnection conn = connection.get();
            conn.setActive(false);
            conn.setAccessToken(null);
            conn.setRefreshToken(null);
            conn.setLastUsedAt(LocalDateTime.now());
            connectionRepository.save(conn);
        }
    }

    /**
     * Get all repositories accessible by user
     */
    public List<String> getUserAccessibleRepositories(String userId) {
        Optional<GitHubConnection> connection = getUserConnection(userId);
        return connection.map(GitHubConnection::getAccessibleRepositories)
                        .orElse(Collections.emptyList());
    }
}
