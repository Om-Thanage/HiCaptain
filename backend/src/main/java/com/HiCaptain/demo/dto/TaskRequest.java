package com.HiCaptain.demo.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.time.LocalDate;
import java.util.List;

@Data
public class TaskRequest {
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
}
