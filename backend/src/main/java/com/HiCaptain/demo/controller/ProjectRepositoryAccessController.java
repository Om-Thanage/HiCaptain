package com.HiCaptain.demo.controller;

import com.HiCaptain.demo.model.ProjectRepositoryAccess;
import com.HiCaptain.demo.service.ProjectRepositoryAccessService;
import com.HiCaptain.demo.service.JwtService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/project-repository-access")
@CrossOrigin(origins = "http://localhost:3000")
public class ProjectRepositoryAccessController {

    @Autowired
    private ProjectRepositoryAccessService accessService;

    @Autowired
    private JwtService jwtService;

    /**
     * Grant repository access to a project (Project Managers and Admins only)
     */
    @PostMapping("/grant")
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager')")
    public ResponseEntity<Map<String, Object>> grantRepositoryAccess(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody Map<String, Object> request) {
        
        try {
            String token = authHeader.replace("Bearer ", "");
            String userId = jwtService.extractUserId(token);
            
            String projectId = (String) request.get("projectId");
            String repositoryFullName = (String) request.get("repositoryFullName");
            List<String> authorizedUserIds = (List<String>) request.get("authorizedUserIds");
            List<String> assignedDeveloperIds = (List<String>) request.get("assignedDeveloperIds");
            String scheduleType = (String) request.get("scheduleType");
            
            LocalDateTime scheduleStartDate = null;
            LocalDateTime scheduleEndDate = null;
            
            if (request.get("scheduleStartDate") != null) {
                scheduleStartDate = LocalDateTime.parse((String) request.get("scheduleStartDate"));
            }
            if (request.get("scheduleEndDate") != null) {
                scheduleEndDate = LocalDateTime.parse((String) request.get("scheduleEndDate"));
            }
            
            ProjectRepositoryAccess access = accessService.grantRepositoryAccess(
                projectId, repositoryFullName, userId, authorizedUserIds, 
                assignedDeveloperIds, scheduleType, scheduleStartDate, scheduleEndDate
            );
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Repository access granted successfully");
            response.put("access", access);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", "Failed to grant repository access: " + e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * Get repositories accessible for a project
     */
    @GetMapping("/project/{projectId}")
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager','Client','Developer')")
    public ResponseEntity<Map<String, Object>> getProjectRepositories(
            @PathVariable String projectId,
            @RequestHeader("Authorization") String authHeader) {
        
        try {
            List<ProjectRepositoryAccess> repositories = accessService.getProjectRepositories(projectId);
            
            Map<String, Object> response = new HashMap<>();
            response.put("projectId", projectId);
            response.put("repositories", repositories);
            response.put("totalCount", repositories.size());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Failed to get project repositories: " + e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * Get repositories accessible by a user across all projects
     */
    @GetMapping("/user/accessible")
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager','Developer')")
    public ResponseEntity<Map<String, Object>> getUserAccessibleRepositories(
            @RequestHeader("Authorization") String authHeader) {
        
        try {
            String token = authHeader.replace("Bearer ", "");
            String userId = jwtService.extractUserId(token);
            
            List<ProjectRepositoryAccess> repositories = accessService.getUserAccessibleRepositories(userId);
            
            Map<String, Object> response = new HashMap<>();
            response.put("userId", userId);
            response.put("repositories", repositories);
            response.put("totalCount", repositories.size());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Failed to get user accessible repositories: " + e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * Get repositories assigned to a developer
     */
    @GetMapping("/developer/assigned")
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager','Developer')")
    public ResponseEntity<Map<String, Object>> getDeveloperAssignedRepositories(
            @RequestHeader("Authorization") String authHeader) {
        
        try {
            String token = authHeader.replace("Bearer ", "");
            String userId = jwtService.extractUserId(token);
            
            List<ProjectRepositoryAccess> repositories = accessService.getDeveloperAssignedRepositories(userId);
            
            Map<String, Object> response = new HashMap<>();
            response.put("developerId", userId);
            response.put("assignedRepositories", repositories);
            response.put("totalCount", repositories.size());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Failed to get developer assigned repositories: " + e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * Check if user has access to a repository within a project
     */
    @GetMapping("/check-access")
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager','Client','Developer')")
    public ResponseEntity<Map<String, Object>> checkRepositoryAccess(
            @RequestParam String projectId,
            @RequestParam String repositoryFullName,
            @RequestHeader("Authorization") String authHeader) {
        
        try {
            String token = authHeader.replace("Bearer ", "");
            String userId = jwtService.extractUserId(token);
            
            boolean hasAccess = accessService.hasProjectRepositoryAccess(userId, projectId, repositoryFullName);
            
            Map<String, Object> response = new HashMap<>();
            response.put("hasAccess", hasAccess);
            response.put("userId", userId);
            response.put("projectId", projectId);
            response.put("repositoryFullName", repositoryFullName);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("hasAccess", false);
            error.put("error", "Failed to check repository access: " + e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * Update repository access permissions
     */
    @PutMapping("/{accessId}")
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager')")
    public ResponseEntity<Map<String, Object>> updateRepositoryAccess(
            @PathVariable String accessId,
            @RequestBody Map<String, Object> request) {
        
        try {
            List<String> authorizedUserIds = (List<String>) request.get("authorizedUserIds");
            List<String> assignedDeveloperIds = (List<String>) request.get("assignedDeveloperIds");
            Boolean monitoringEnabled = (Boolean) request.get("monitoringEnabled");
            Boolean webhookEnabled = (Boolean) request.get("webhookEnabled");
            
            ProjectRepositoryAccess access = accessService.updateRepositoryAccess(
                accessId, authorizedUserIds, assignedDeveloperIds, 
                monitoringEnabled != null ? monitoringEnabled : true,
                webhookEnabled != null ? webhookEnabled : false
            );
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Repository access updated successfully");
            response.put("access", access);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", "Failed to update repository access: " + e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * Revoke repository access for a project
     */
    @DeleteMapping("/revoke")
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager')")
    public ResponseEntity<Map<String, Object>> revokeRepositoryAccess(
            @RequestParam String projectId,
            @RequestParam String repositoryFullName,
            @RequestHeader("Authorization") String authHeader) {
        
        try {
            String token = authHeader.replace("Bearer ", "");
            String userId = jwtService.extractUserId(token);
            
            accessService.revokeRepositoryAccess(projectId, repositoryFullName, userId);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Repository access revoked successfully");
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", "Failed to revoke repository access: " + e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * Update schedule for repository access
     */
    @PutMapping("/{accessId}/schedule")
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager')")
    public ResponseEntity<Map<String, Object>> updateRepositorySchedule(
            @PathVariable String accessId,
            @RequestBody Map<String, Object> request) {
        
        try {
            String scheduleType = (String) request.get("scheduleType");
            String workingHours = (String) request.get("workingHours");
            List<String> workingDays = (List<String>) request.get("workingDays");
            
            LocalDateTime scheduleStartDate = null;
            LocalDateTime scheduleEndDate = null;
            
            if (request.get("scheduleStartDate") != null) {
                scheduleStartDate = LocalDateTime.parse((String) request.get("scheduleStartDate"));
            }
            if (request.get("scheduleEndDate") != null) {
                scheduleEndDate = LocalDateTime.parse((String) request.get("scheduleEndDate"));
            }
            
            ProjectRepositoryAccess access = accessService.updateRepositorySchedule(
                accessId, scheduleType, scheduleStartDate, scheduleEndDate, workingHours, workingDays
            );
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Repository schedule updated successfully");
            response.put("access", access);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", "Failed to update repository schedule: " + e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
}