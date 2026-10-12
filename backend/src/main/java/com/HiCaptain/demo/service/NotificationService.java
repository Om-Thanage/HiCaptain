package com.HiCaptain.demo.service;

import com.HiCaptain.demo.model.Notification;
import com.HiCaptain.demo.repository.NotificationRepository;
import com.HiCaptain.demo.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class NotificationService {

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private UserRepository userRepository;
    @Autowired private OrganizationService organizations;
    @Autowired private ProjectService projects;

    /**
     * Create a new notification
     */
    public Notification createNotification(
            String userId, 
            String title, 
            String message,
            String type,
            String category,
            String sourceType,
            String sourceId,
            String sourceUrl,
            String projectId,
            String priority) {

        // Get username
        String username = userRepository.findById(userId)
            .map(user -> user.getName())
            .orElse("Unknown User");

        Notification notification = new Notification();
        notification.setUserId(userId);
        notification.setOrganizationId(projectId == null ? organizations.currentOrgId() :
                projects.getById(projectId).orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND)).getOrganizationId());
        notification.setUsername(username);
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setType(type);
        notification.setCategory(category);
        notification.setSourceType(sourceType);
        notification.setSourceId(sourceId);
        notification.setSourceUrl(sourceUrl);
        notification.setProjectId(projectId);
        notification.setPriority(priority != null ? priority : "normal");
        notification.setCreatedAt(LocalDateTime.now());

        // Set expiration (30 days for normal, 7 days for low priority)
        if ("low".equals(priority)) {
            notification.setExpiresAt(LocalDateTime.now().plusDays(7));
        } else {
            notification.setExpiresAt(LocalDateTime.now().plusDays(30));
        }

        return notificationRepository.save(notification);
    }

    /**
     * Create task-related notification
     */
    public Notification createTaskNotification(
            String userId, 
            String taskId, 
            String taskTitle, 
            String action, 
            String projectId,
            String projectName) {

        String title = "Task " + action;
        String message = "Task '" + taskTitle + "' has been " + action.toLowerCase();
        if (projectName != null) {
            message += " in project '" + projectName + "'";
        }

        Notification notification = createNotification(
            userId, title, message, "info", "task", "task", taskId,
            "/tasks/" + taskId, projectId, "normal"
        );
        
        notification.setTaskId(taskId);
        notification.setProjectName(projectName);
        
        return notificationRepository.save(notification);
    }

    /**
     * Create GitHub-related notification
     */
    public Notification createGitHubNotification(
            String userId,
            String repositoryFullName,
            String action,
            String details,
            String sourceId,
            String projectId) {

        String title = "GitHub: " + action;
        String message = action + " in repository " + repositoryFullName;
        if (details != null) {
            message += ": " + details;
        }

        Notification notification = createNotification(
            userId, title, message, "info", "github", "commit", sourceId,
            projectId == null ? "/projects" : "/projects/" + projectId, projectId, "normal"
        );
        
        notification.setRepositoryFullName(repositoryFullName);
        
        return notificationRepository.save(notification);
    }

    /**
     * Create meeting reminder notification
     */
    public Notification createMeetingNotification(
            String userId,
            String meetingId,
            String meetingTitle,
            LocalDateTime meetingTime,
            String type,
            String projectId) {

        String title = "Meeting Reminder";
        String message = "Meeting '" + meetingTitle + "' is scheduled for " + 
                        meetingTime.toString();

        Notification notification = createNotification(
            userId, title, message, "warning", "meeting", "meeting", meetingId,
            "/meetings/" + meetingId, projectId, "high"
        );
        
        // Set to expire 1 hour after meeting time
        notification.setExpiresAt(meetingTime.plusHours(1));
        
        return notificationRepository.save(notification);
    }

    /**
     * Create project-related notification
     */
    public Notification createProjectNotification(
            String userId,
            String projectId,
            String projectName,
            String action,
            String details) {

        String title = "Project " + action;
        String message = "Project '" + projectName + "' has been " + action.toLowerCase();
        if (details != null) {
            message += ": " + details;
        }

        Notification notification = createNotification(
            userId, title, message, "info", "project", "project", projectId,
            "/projects/" + projectId, projectId, "normal"
        );
        
        notification.setProjectName(projectName);
        
        return notificationRepository.save(notification);
    }

    /**
     * Get user's notifications with pagination
     */
    public List<Notification> getUserNotifications(String userId, boolean unreadOnly, int limit) {
        List<Notification> notifications;
        
        if (unreadOnly) {
            notifications = notificationRepository.findByUserIdAndReadFalseAndDismissedFalseOrderByCreatedAtDesc(userId);
        } else {
            notifications = notificationRepository.findByUserIdAndDismissedFalseOrderByCreatedAtDesc(userId);
        }
        
        notifications = notifications.stream().filter(this::belongsToActiveOrganization).toList();
        // Apply limit
        if (limit > 0 && notifications.size() > limit) {
            notifications = notifications.subList(0, limit);
        }
        
        return notifications;
    }

    /**
     * Get notifications by category
     */
    public List<Notification> getUserNotificationsByCategory(String userId, String category) {
        return notificationRepository.findByUserIdAndCategoryOrderByCreatedAtDesc(userId, category).stream().filter(this::belongsToActiveOrganization).toList();
    }

    /**
     * Get unread notification count
     */
    public long getUnreadNotificationCount(String userId) {
        return getUserNotifications(userId, true, 0).size();
    }

    /**
     * Mark notification as read
     */
    public Notification markAsRead(String notificationId, String userId) {
        Optional<Notification> notificationOpt = notificationRepository.findById(notificationId);
        
        if (notificationOpt.isPresent()) {
            Notification notification = notificationOpt.get();
            
            // Verify ownership
            if (!notification.getUserId().equals(userId)) {
                throw new RuntimeException("Notification not found or access denied");
            }
            if (!belongsToActiveOrganization(notification)) throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND);
            
            if (!notification.isRead()) {
                notification.setRead(true);
                notification.setReadAt(LocalDateTime.now());
                return notificationRepository.save(notification);
            }
        }
        
        return notificationOpt.orElse(null);
    }

    /**
     * Mark all notifications as read for a user
     */
    public void markAllAsRead(String userId) {
        List<Notification> unreadNotifications = 
            notificationRepository.findByUserIdAndReadFalseOrderByCreatedAtDesc(userId);
        
        unreadNotifications.stream().filter(this::belongsToActiveOrganization).forEach(notification -> {
            notification.setRead(true);
            notification.setReadAt(LocalDateTime.now());
        });

        notificationRepository.saveAll(unreadNotifications.stream().filter(this::belongsToActiveOrganization).toList());
    }

    /**
     * Dismiss notification
     */
    public Notification dismissNotification(String notificationId, String userId) {
        Optional<Notification> notificationOpt = notificationRepository.findById(notificationId);
        
        if (notificationOpt.isPresent()) {
            Notification notification = notificationOpt.get();
            
            // Verify ownership
            if (!notification.getUserId().equals(userId)) {
                throw new RuntimeException("Notification not found or access denied");
            }
            if (!belongsToActiveOrganization(notification)) throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND);
            
            if (!notification.isDismissed()) {
                notification.setDismissed(true);
                notification.setDismissedAt(LocalDateTime.now());
                
                // Also mark as read
                if (!notification.isRead()) {
                    notification.setRead(true);
                    notification.setReadAt(LocalDateTime.now());
                }
                
                return notificationRepository.save(notification);
            }
        }
        
        return notificationOpt.orElse(null);
    }

    /**
     * Delete old notifications (cleanup job)
     */
    public void cleanupOldNotifications() {
        // Delete notifications older than 90 days that are read and dismissed
        LocalDateTime cutoffDate = LocalDateTime.now().minusDays(90);
        List<Notification> oldNotifications = 
            notificationRepository.findByCreatedAtBeforeAndReadTrueAndDismissedTrue(cutoffDate);
        
        notificationRepository.deleteAll(oldNotifications);
        
        // Auto-dismiss expired notifications
        List<Notification> expiredNotifications = 
            notificationRepository.findByExpiresAtBeforeAndDismissedFalse(LocalDateTime.now());
        
        expiredNotifications.forEach(notification -> {
            notification.setDismissed(true);
            notification.setDismissedAt(LocalDateTime.now());
        });
        
        notificationRepository.saveAll(expiredNotifications);
    }

    /**
     * Send bulk notifications to multiple users
     */
    public void sendBulkNotification(
            List<String> userIds,
            String title,
            String message,
            String type,
            String category,
            String sourceType,
            String sourceId,
            String priority) {

        userIds.forEach(userId -> {
            createNotification(userId, title, message, type, category, 
                             sourceType, sourceId, null, null, priority);
        });
    }

    /**
     * Get notification statistics for admin dashboard
     */
    public Map<String, Object> getNotificationStats() {
        long totalNotifications = notificationRepository.findAll().stream().filter(this::belongsToActiveOrganization).count();
        
        // This is a simplified version - you can expand with more detailed stats
        return Map.of(
            "totalNotifications", totalNotifications,
            "timestamp", LocalDateTime.now()
        );
    }

    private boolean belongsToActiveOrganization(Notification notification) {
        if (notification.getOrganizationId() != null) {
            return notification.getOrganizationId().equals(organizations.currentOrgId());
        }
        return notification.getProjectId() != null && projects.getById(notification.getProjectId()).isPresent();
    }
}
