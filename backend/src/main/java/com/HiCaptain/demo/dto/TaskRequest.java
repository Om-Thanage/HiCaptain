package com.HiCaptain.demo.dto;

import lombok.Data;
import java.time.LocalDate;
import java.util.List;

@Data
public class TaskRequest {
    private String title;
    private String description;
    private String status;
    private String priority;
    private LocalDate deadline;
    private String projectId;
    private List<String> assignedDeveloperIds;
}
