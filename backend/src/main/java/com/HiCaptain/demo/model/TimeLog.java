package com.HiCaptain.demo.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Document(collection = "timelogs")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class TimeLog {

    @Id
    private String id;

    private LocalDate dateLogged;
    private double hoursWorked;

    private String userId;
    private String taskId;
    private String projectId;

    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private String description;
    
    // Additional fields for compatibility with analytics
    private Integer hoursLogged;
    private Integer minutesLogged;
}
