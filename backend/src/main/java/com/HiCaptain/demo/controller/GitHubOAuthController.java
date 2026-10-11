package com.HiCaptain.demo.controller;

import com.HiCaptain.demo.model.GitHubConnection;
import com.HiCaptain.demo.service.GitHubOAuthService;
import com.HiCaptain.demo.service.JwtService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.view.RedirectView;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth/github")
@CrossOrigin(origins = "http://localhost:3000")
public class GitHubOAuthController {

    @Autowired
    private GitHubOAuthService oauthService;

    @Autowired
    private JwtService jwtService;

    /**
     * Step 1: Initiate GitHub OAuth (like Vercel's "Connect GitHub" button)
     * Frontend calls this endpoint when user clicks "Connect GitHub"
     */
    @PostMapping("/connect")
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager','Developer')")
    public ResponseEntity<Map<String, String>> initiateGitHubOAuth(
            @RequestHeader("Authorization") String authHeader) {
        
        try {
            // Extract user ID from JWT token
            String token = authHeader.replace("Bearer ", "");
            String userId = jwtService.extractUserId(token);
            
            // Generate random state for security
            String state = jwtService.generateOAuthState(userId, "github");
            
            // Get GitHub OAuth authorization URL
            String authUrl = oauthService.getAuthorizationUrl(userId, state);
            
            Map<String, String> response = new HashMap<>();
            response.put("authUrl", authUrl);
            response.put("message", "Redirect user to this URL to authorize GitHub access");
            
            return ResponseEntity.ok(response);
            
        } catch (RuntimeException e) {
            // Handle missing OAuth configuration gracefully
            Map<String, String> error = new HashMap<>();
            error.put("error", "GitHub OAuth not configured: " + e.getMessage());
            return ResponseEntity.badRequest().body(error);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to initiate GitHub OAuth: " + e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * Step 2: Handle GitHub OAuth callback
     * GitHub redirects here after user authorizes the app
     */
    @GetMapping("/callback")
    public RedirectView handleGitHubCallback(
            @RequestParam String code,
            @RequestParam String state,
            @RequestParam(required = false) String error,
            @RequestParam(required = false, name = "error_description") String errorDescription) {
        
        try {
            if (error != null) {
                // User denied access or other error occurred
                return new RedirectView("http://localhost:3000/git?error=" + error + 
                                      "&error_description=" + (errorDescription != null ? errorDescription : ""));
            }
            
            // Exchange code for access token and create connection
            GitHubConnection connection = oauthService.handleCallback(code, state);
            
            // Redirect back to frontend with success message
            return new RedirectView("http://localhost:3000/git?connected=true&username=" + 
                                  connection.getGithubUsername());
            
        } catch (Exception e) {
            // Redirect back to frontend with error message
            return new RedirectView("http://localhost:3000/git?error=oauth_failed&message=" + 
                                  e.getMessage());
        }
    }

    /**
     * Get user's GitHub connection status
     */
    @GetMapping("/status")
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager','Developer')")
    public ResponseEntity<Map<String, Object>> getConnectionStatus(
            @RequestHeader("Authorization") String authHeader) {
        
        try {
            String token = authHeader.replace("Bearer ", "");
            String userId = jwtService.extractUserId(token);
            
            Optional<GitHubConnection> connection = oauthService.getUserConnection(userId);
            
            Map<String, Object> response = new HashMap<>();
            if (connection.isPresent()) {
                GitHubConnection conn = connection.get();
                response.put("connected", true);
                response.put("githubUsername", conn.getGithubUsername());
                response.put("githubAvatarUrl", conn.getGithubAvatarUrl());
                response.put("connectedAt", conn.getConnectedAt());
                response.put("repositoryCount", conn.getAccessibleRepositories() != null ? 
                           conn.getAccessibleRepositories().size() : 0);
                response.put("scopes", conn.getScopes());
                response.put("canAccessPrivateRepos", conn.isCanAccessPrivateRepos());
            } else {
                response.put("connected", false);
                response.put("message", "GitHub account not connected");
            }
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("connected", false);
            error.put("error", "Failed to get connection status: " + e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * Get user's accessible repositories
     */
    @GetMapping("/repositories")
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager','Developer')")
    public ResponseEntity<Map<String, Object>> getAccessibleRepositories(
            @RequestHeader("Authorization") String authHeader) {
        
        try {
            String token = authHeader.replace("Bearer ", "");
            String userId = jwtService.extractUserId(token);
            
            Optional<GitHubConnection> connection = oauthService.getUserConnection(userId);
            if (connection.isEmpty()) {
                Map<String, Object> error = new HashMap<>();
                error.put("error", "GitHub account not connected");
                return ResponseEntity.badRequest().body(error);
            }
            
            Map<String, Object> response = new HashMap<>();
            response.put("repositories", connection.get().getAccessibleRepositories());
            response.put("totalCount", connection.get().getAccessibleRepositories().size());
            response.put("canAccessAllRepos", connection.get().isCanAccessAllRepos());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Failed to get repositories: " + e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * Disconnect GitHub account
     */
    @PostMapping("/disconnect")
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager','Developer')")
    public ResponseEntity<Map<String, String>> disconnectGitHub(
            @RequestHeader("Authorization") String authHeader) {
        
        try {
            String token = authHeader.replace("Bearer ", "");
            String userId = jwtService.extractUserId(token);
            
            oauthService.disconnectGitHub(userId);
            
            Map<String, String> response = new HashMap<>();
            response.put("message", "GitHub account disconnected successfully");
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to disconnect GitHub: " + e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * Check if user has access to a specific repository
     */
    @GetMapping("/access/{owner}/{repo}")
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager','Developer')")
    public ResponseEntity<Map<String, Object>> checkRepositoryAccess(
            @PathVariable String owner,
            @PathVariable String repo,
            @RequestHeader("Authorization") String authHeader) {
        
        try {
            String token = authHeader.replace("Bearer ", "");
            String userId = jwtService.extractUserId(token);
            
            String repositoryFullName = owner + "/" + repo;
            boolean hasAccess = oauthService.hasRepositoryAccess(userId, repositoryFullName);
            
            Map<String, Object> response = new HashMap<>();
            response.put("hasAccess", hasAccess);
            response.put("repository", repositoryFullName);
            
            if (!hasAccess) {
                response.put("message", "User does not have access to this repository");
            }
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("hasAccess", false);
            error.put("error", "Failed to check repository access: " + e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
}
