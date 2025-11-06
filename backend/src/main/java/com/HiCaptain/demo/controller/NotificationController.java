package com.HiCaptain.demo.controller;

import com.HiCaptain.demo.model.Notification;
import com.HiCaptain.demo.service.NotificationService;
import com.HiCaptain.demo.service.JwtService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@CrossOrigin(origins = "http://localhost:3000")
public class NotificationController {

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private JwtService jwtService;

    /**
     * Get user's notifications
     */
    @GetMapping("")
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager','Client','Developer')")
    public ResponseEntity<Map<String, Object>> getUserNotifications(
            @RequestParam(defaultValue = "false") boolean unreadOnly,
            @RequestParam(defaultValue = "50") int limit,
            @RequestHeader("Authorization") String authHeader) {
        
        try {
            String token = authHeader.replace("Bearer ", "");
            String userId = jwtService.extractUserId(token);
            
            List<Notification> notifications = notificationService.getUserNotifications(userId, unreadOnly, limit);
            long unreadCount = notificationService.getUnreadNotificationCount(userId);
            
            Map<String, Object> response = new HashMap<>();
            response.put("notifications", notifications);
            response.put("unreadCount", unreadCount);
            response.put("totalCount", notifications.size());
            response.put("unreadOnly", unreadOnly);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Failed to get notifications: " + e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * Get notifications by category
     */
    @GetMapping("/category/{category}")
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager','Client','Developer')")
    public ResponseEntity<Map<String, Object>> getNotificationsByCategory(
            @PathVariable String category,
            @RequestHeader("Authorization") String authHeader) {
        
        try {
            String token = authHeader.replace("Bearer ", "");
            String userId = jwtService.extractUserId(token);
            
            List<Notification> notifications = notificationService.getUserNotificationsByCategory(userId, category);
            
            Map<String, Object> response = new HashMap<>();
            response.put("notifications", notifications);
            response.put("category", category);
            response.put("totalCount", notifications.size());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Failed to get notifications by category: " + e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * Get unread notification count
     */
    @GetMapping("/unread-count")
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager','Client','Developer')")
    public ResponseEntity<Map<String, Object>> getUnreadNotificationCount(
            @RequestHeader("Authorization") String authHeader) {
        
        try {
            String token = authHeader.replace("Bearer ", "");
            String userId = jwtService.extractUserId(token);
            
            long unreadCount = notificationService.getUnreadNotificationCount(userId);
            
            Map<String, Object> response = new HashMap<>();
            response.put("unreadCount", unreadCount);
            response.put("userId", userId);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Failed to get unread count: " + e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * Mark notification as read
     */
    @PutMapping("/{notificationId}/read")
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager','Client','Developer')")
    public ResponseEntity<Map<String, Object>> markAsRead(
            @PathVariable String notificationId,
            @RequestHeader("Authorization") String authHeader) {
        
        try {
            String token = authHeader.replace("Bearer ", "");
            String userId = jwtService.extractUserId(token);
            
            Notification notification = notificationService.markAsRead(notificationId, userId);
            
            Map<String, Object> response = new HashMap<>();
            if (notification != null) {
                response.put("success", true);
                response.put("message", "Notification marked as read");
                response.put("notification", notification);
            } else {
                response.put("success", false);
                response.put("message", "Notification not found or already read");
            }
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", "Failed to mark notification as read: " + e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * Mark all notifications as read
     */
    @PutMapping("/mark-all-read")
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager','Client','Developer')")
    public ResponseEntity<Map<String, Object>> markAllAsRead(
            @RequestHeader("Authorization") String authHeader) {
        
        try {
            String token = authHeader.replace("Bearer ", "");
            String userId = jwtService.extractUserId(token);
            
            notificationService.markAllAsRead(userId);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "All notifications marked as read");
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", "Failed to mark all notifications as read: " + e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * Dismiss notification
     */
    @PutMapping("/{notificationId}/dismiss")
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager','Client','Developer')")
    public ResponseEntity<Map<String, Object>> dismissNotification(
            @PathVariable String notificationId,
            @RequestHeader("Authorization") String authHeader) {
        
        try {
            String token = authHeader.replace("Bearer ", "");
            String userId = jwtService.extractUserId(token);
            
            Notification notification = notificationService.dismissNotification(notificationId, userId);
            
            Map<String, Object> response = new HashMap<>();
            if (notification != null) {
                response.put("success", true);
                response.put("message", "Notification dismissed");
                response.put("notification", notification);
            } else {
                response.put("success", false);
                response.put("message", "Notification not found or already dismissed");
            }
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", "Failed to dismiss notification: " + e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * Create a new notification (Admin, ProjectManager, Client only)
     */
    @PostMapping
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager','Client')")
    public ResponseEntity<Map<String, Object>> createNotification(
            @RequestBody Map<String, Object> request,
            @RequestHeader("Authorization") String authHeader) {
        
        try {
            String token = authHeader.replace("Bearer ", "");
            String createdBy = jwtService.extractUserId(token);
            
            String targetUserId = (String) request.get("userId");
            String title = (String) request.get("title");
            String message = (String) request.get("message");
            String type = (String) request.getOrDefault("type", "info");
            String category = (String) request.getOrDefault("category", "system");
            String priority = (String) request.getOrDefault("priority", "normal");
            String sourceType = (String) request.getOrDefault("sourceType", "manual");
            String sourceId = (String) request.get("sourceId");
            String sourceUrl = (String) request.get("sourceUrl");
            String projectId = (String) request.get("projectId");
            
            if (targetUserId == null || title == null || message == null) {
                Map<String, Object> error = new HashMap<>();
                error.put("success", false);
                error.put("error", "Missing required fields: userId, title, message");
                return ResponseEntity.badRequest().body(error);
            }
            
            Notification notification = notificationService.createNotification(
                targetUserId, title, message, type, category, sourceType, sourceId, 
                sourceUrl, projectId, priority
            );
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Notification created successfully");
            response.put("notification", notification);
            response.put("createdBy", createdBy);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", "Failed to create notification: " + e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * Create a test notification (for development/testing)
     */
    @PostMapping("/test")
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager')")
    public ResponseEntity<Map<String, Object>> createTestNotification(
            @RequestBody Map<String, String> request,
            @RequestHeader("Authorization") String authHeader) {
        
        try {
            String token = authHeader.replace("Bearer ", "");
            String userId = jwtService.extractUserId(token);
            
            String title = request.getOrDefault("title", "Test Notification");
            String message = request.getOrDefault("message", "This is a test notification");
            String type = request.getOrDefault("type", "info");
            String category = request.getOrDefault("category", "system");
            String priority = request.getOrDefault("priority", "normal");
            
            Notification notification = notificationService.createNotification(
                userId, title, message, type, category, "system", "test", 
                "/notifications", null, priority
            );
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Test notification created");
            response.put("notification", notification);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", "Failed to create test notification: " + e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * Get notification statistics (for admin dashboard)
     */
    @GetMapping("/stats")
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager')")
    public ResponseEntity<Map<String, Object>> getNotificationStats() {
        
        try {
            Map<String, Object> stats = notificationService.getNotificationStats();
            return ResponseEntity.ok(stats);
            
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Failed to get notification stats: " + e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
}