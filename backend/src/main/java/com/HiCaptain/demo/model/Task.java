package com.HiCaptain.demo.model;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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

    @NotBlank(message = "Title is required")
    private String title;
    
    private String description;
    
    @NotBlank(message = "Status is required")
    private String status;
    
    private String priority;
    
    @NotNull(message = "Deadline is required")
    private LocalDate deadline;
    
    @NotBlank(message = "Project ID is required")
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
