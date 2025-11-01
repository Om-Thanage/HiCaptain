package com.HiCaptain.demo.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Document(collection = "tasks")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class Task {

    @Id
    private String id;

    private String title;
    private String description;
    private String status;
    private String priority;
    private LocalDate deadline;
    private String projectId;
    private List<String> assignedDeveloperIds;
    
    // Additional fields for better task management
    private String assigneeId; // Primary assignee
    private String createdBy;
    private String category;
    private int estimatedHours;
    private int actualHours;
    private double progress; // 0-100
    
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
