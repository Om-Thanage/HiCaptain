package com.HiCaptain.demo.repository;

import com.HiCaptain.demo.model.Notification;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface NotificationRepository extends MongoRepository<Notification, String> {
    
    // Find by user
    List<Notification> findByUserIdOrderByCreatedAtDesc(String userId);
    List<Notification> findByUserIdAndReadOrderByCreatedAtDesc(String userId, boolean read);
    List<Notification> findByUserIdAndDismissedOrderByCreatedAtDesc(String userId, boolean dismissed);
    
    // Find unread/undismissed
    List<Notification> findByUserIdAndReadFalseOrderByCreatedAtDesc(String userId);
    List<Notification> findByUserIdAndDismissedFalseOrderByCreatedAtDesc(String userId);
    List<Notification> findByUserIdAndReadFalseAndDismissedFalseOrderByCreatedAtDesc(String userId);
    
    // Count unread
    long countByUserIdAndReadFalse(String userId);
    long countByUserIdAndDismissedFalse(String userId);
    
    // Find by category/type
    List<Notification> findByUserIdAndCategoryOrderByCreatedAtDesc(String userId, String category);
    List<Notification> findByUserIdAndTypeOrderByCreatedAtDesc(String userId, String type);
    List<Notification> findByUserIdAndPriorityOrderByCreatedAtDesc(String userId, String priority);
    
    // Find by source
    List<Notification> findBySourceTypeAndSourceId(String sourceType, String sourceId);
    List<Notification> findByProjectId(String projectId);
    List<Notification> findByTaskId(String taskId);
    
    // Find by time range
    List<Notification> findByUserIdAndCreatedAtBetweenOrderByCreatedAtDesc(
        String userId, LocalDateTime startDate, LocalDateTime endDate);
    
    // Find expired notifications
    List<Notification> findByExpiresAtBeforeAndDismissedFalse(LocalDateTime now);
    
    // Find for grouping
    List<Notification> findByGroupKeyAndUserIdOrderByCreatedAtDesc(String groupKey, String userId);
    
    // Cleanup old notifications
    List<Notification> findByCreatedAtBeforeAndReadTrueAndDismissedTrue(LocalDateTime cutoffDate);
}