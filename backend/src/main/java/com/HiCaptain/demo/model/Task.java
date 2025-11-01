package com.HiCaptain.demo.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDate;
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
}
