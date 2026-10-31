package com.HiCaptain.demo.model;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Document(collection = "projects")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class Project {

    @Id
    private String id;
    private String organizationId;

    @NotBlank(message = "Project name is required")
    private String name;
    
    private String description;
    
    @NotBlank(message = "Status is required")
    private String status;
    
    @NotNull(message = "Start date is required")
    private LocalDate startDate;
    
    private LocalDate endDate;
    private String clientId;
    // Newly added: optional project manager assignment for the project
    private String projectManagerId;
    // Newly added: stores who created the project in format "<Role> : <username>"
    private String createdBy;
    private List<String> developerIds;
    private String googleDriveFolderId;
    private String googleDriveOwnerUserId;
    private Map<String, String> googleDrivePermissionIds;
    private List<String> taskIds;

    // ...existing code...
    // New aggregates maintained automatically by services
    private List<String> feedbackIds;
    private List<String> meetingIds;
    private List<String> timeLogIds;
}
