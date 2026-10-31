package com.HiCaptain.demo.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.Map;

@Document(collection = "notifications")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class Notification {
    
    @Id
    private String id;
    
    // Target user
    private String userId;
    private String organizationId;
    private String username;
    
    // Notification content
    private String title;
    private String message;
    private String type; // "info", "success", "warning", "error"
    private String category; // "task", "project", "github", "meeting", "system"
    
    // Notification state
    private boolean read = false;
    private boolean dismissed = false;
    private String priority = "normal"; // "low", "normal", "high", "urgent"
    
    // Source information
    private String sourceType; // "task", "project", "commit", "pull_request", "meeting", "system"
    private String sourceId; // ID of the source object
    private String sourceUrl; // URL to navigate to when clicked
    
    // Related entities
    private String projectId;
    private String projectName;
    private String taskId;
    private String repositoryFullName;
    
    // Action buttons (optional)
    private Map<String, String> actions; // e.g., {"approve": "/api/tasks/approve", "reject": "/api/tasks/reject"}
    
    // Metadata
    private LocalDateTime createdAt;
    private LocalDateTime readAt;
    private LocalDateTime dismissedAt;
    private LocalDateTime expiresAt; // Auto-dismiss after this time
    
    // Delivery settings
    private boolean emailSent = false;
    private boolean slackSent = false;
    private boolean webPushSent = false;
    
    // Grouping (for similar notifications)
    private String groupKey; // Notifications with same groupKey can be grouped
    private int groupCount = 1; // Number of similar notifications
}
