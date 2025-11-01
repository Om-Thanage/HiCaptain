package com.HiCaptain.demo.controller;

import com.HiCaptain.demo.service.AnalyticsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/analytics")
@CrossOrigin(origins = "http://localhost:3000")
public class AnalyticsController {

    @Autowired
    private AnalyticsService analyticsService;

    @GetMapping("/dashboard")
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager','Client','Developer')")
    public ResponseEntity<Map<String, Object>> getDashboardAnalytics() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String userId = auth.getName();
        String userRole = auth.getAuthorities().iterator().next().getAuthority();
        
        Map<String, Object> analytics = analyticsService.getDashboardAnalytics(userId, userRole);
        return ResponseEntity.ok(analytics);
    }

    @GetMapping("/projects/progress")
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager','Client')")
    public ResponseEntity<List<Map<String, Object>>> getProjectProgress() {
        List<Map<String, Object>> progress = analyticsService.getProjectProgress();
        return ResponseEntity.ok(progress);
    }

    @GetMapping("/user/{userId}/productivity")
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager') or #userId == authentication.name")
    public ResponseEntity<Map<String, Object>> getUserProductivity(@PathVariable String userId) {
        Map<String, Object> productivity = analyticsService.getUserProductivity(userId);
        return ResponseEntity.ok(productivity);
    }

    @GetMapping("/charts/tasks")
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager','Client','Developer')")
    public ResponseEntity<Map<String, Object>> getTaskChartData() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String userId = auth.getName();
        String userRole = auth.getAuthorities().iterator().next().getAuthority();
        
        Map<String, Object> analytics = analyticsService.getDashboardAnalytics(userId, userRole);
        return ResponseEntity.ok(Map.of(
            "taskStats", analytics.get("taskStats"),
            "projectStats", analytics.get("projectStats")
        ));
    }

    @GetMapping("/charts/revenue")
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager','Client')")
    public ResponseEntity<Map<String, Object>> getRevenueChartData() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String userId = auth.getName();
        String userRole = auth.getAuthorities().iterator().next().getAuthority();
        
        Map<String, Object> analytics = analyticsService.getDashboardAnalytics(userId, userRole);
        return ResponseEntity.ok(Map.of(
            "revenueStats", analytics.get("revenueStats")
        ));
    }

    @GetMapping("/charts/git")
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager','Developer')")
    public ResponseEntity<Map<String, Object>> getGitChartData() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String userId = auth.getName();
        String userRole = auth.getAuthorities().iterator().next().getAuthority();
        
        Map<String, Object> analytics = analyticsService.getDashboardAnalytics(userId, userRole);
        return ResponseEntity.ok(Map.of(
            "gitStats", analytics.get("gitStats")
        ));
    }

    @GetMapping("/overview")
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager','Client','Developer')")
    public ResponseEntity<Map<String, Object>> getOverview() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String userId = auth.getName();
        String userRole = auth.getAuthorities().iterator().next().getAuthority();
        
        Map<String, Object> analytics = analyticsService.getDashboardAnalytics(userId, userRole);
        
        // Return only overview data
        return ResponseEntity.ok(Map.of(
            "totalProjects", analytics.get("totalProjects"),
            "totalTasks", analytics.get("totalTasks"),
            "totalUsers", analytics.get("totalUsers"),
            "totalMeetings", analytics.get("totalMeetings"),
            "recentActivity", analytics.get("recentActivity")
        ));
    }

    // Main analytics endpoint that frontend calls
    @GetMapping("")
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager','Client','Developer')")
    public ResponseEntity<Map<String, Object>> getAnalytics() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String userId = auth.getName();
        String userRole = auth.getAuthorities().iterator().next().getAuthority();
        
        Map<String, Object> analytics = analyticsService.getDashboardAnalytics(userId, userRole);
        return ResponseEntity.ok(analytics);
    }

    // Project-specific analytics
    @GetMapping("/project/{projectId}")
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager','Client','Developer')")
    public ResponseEntity<Map<String, Object>> getProjectAnalytics(@PathVariable String projectId) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String userId = auth.getName();
        String userRole = auth.getAuthorities().iterator().next().getAuthority();
        
        Map<String, Object> analytics = analyticsService.getProjectAnalytics(projectId, userId, userRole);
        return ResponseEntity.ok(analytics);
    }

    // User-specific analytics
    @GetMapping("/user/{targetUserId}")
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager') or #targetUserId == authentication.name")
    public ResponseEntity<Map<String, Object>> getUserAnalyticsEndpoint(@PathVariable String targetUserId) {
        Map<String, Object> analytics = analyticsService.getUserAnalytics(targetUserId);
        return ResponseEntity.ok(analytics);
    }

    // Recent activities
    @GetMapping("/activities")
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager','Client','Developer')")
    public ResponseEntity<List<Map<String, Object>>> getRecentActivities(@RequestParam(defaultValue = "10") int limit) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String userId = auth.getName();
        String userRole = auth.getAuthorities().iterator().next().getAuthority();
        
        List<Map<String, Object>> activities = analyticsService.getRecentActivities(userId, userRole, limit);
        return ResponseEntity.ok(activities);
    }
}