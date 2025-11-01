package com.HiCaptain.demo.controller;

import com.HiCaptain.demo.service.GitHubServiceStub;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingClass;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/github")
@CrossOrigin(origins = "http://localhost:3000")
@ConditionalOnMissingClass("org.kohsuke.github.GitHub")
public class GitHubControllerStub {

    @Autowired
    private GitHubServiceStub gitHubServiceStub;

    @GetMapping("/status")
    public ResponseEntity<String> getStatus() {
        return ResponseEntity.ok("GitHub integration is not available. Please configure GitHub API dependencies.");
    }

    @PostMapping("/repositories/sync")
    public ResponseEntity<String> syncRepository(@RequestParam String owner, @RequestParam String repoName, @RequestParam String projectId) {
        return ResponseEntity.badRequest().body("GitHub integration is not available. Please configure GitHub API dependencies.");
    }

    @GetMapping("/repositories")
    public ResponseEntity<String> getRepositoriesByProject(@RequestParam String projectId) {
        return ResponseEntity.badRequest().body("GitHub integration is not available. Please configure GitHub API dependencies.");
    }
}