package com.HiCaptain.demo.repository;

import com.HiCaptain.demo.model.TimeLog;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface TimeLogRepository extends MongoRepository<TimeLog, String> {
    List<TimeLog> findByUserId(String userId);
    List<TimeLog> findByProjectId(String projectId);
    List<TimeLog> findByTaskId(String taskId);
    List<TimeLog> findByDateLoggedBetween(LocalDate startDate, LocalDate endDate);
    List<TimeLog> findByUserIdAndDateLoggedBetween(String userId, LocalDate startDate, LocalDate endDate);
    void deleteByProjectId(String projectId);
    void deleteByTaskId(String taskId);
}
