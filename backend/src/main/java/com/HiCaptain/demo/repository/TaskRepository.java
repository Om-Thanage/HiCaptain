package com.HiCaptain.demo.repository;

import com.HiCaptain.demo.model.Task;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TaskRepository extends MongoRepository<Task, String> {
    List<Task> findByProjectId(String projectId);
    List<Task> findByAssigneeId(String assigneeId);
    List<Task> findByStatus(String status);
    List<Task> findByPriority(String priority);
    List<Task> findTop10ByOrderByUpdatedAtDesc();
    List<Task> findByAssigneeIdOrderByUpdatedAtDesc(String assigneeId);
    void deleteByProjectId(String projectId);
}
