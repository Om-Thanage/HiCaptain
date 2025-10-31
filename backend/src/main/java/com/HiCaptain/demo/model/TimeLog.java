package com.HiCaptain.demo.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.DBRef;
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

    @DBRef
    private User user;

    @DBRef
    private Task task;

    @DBRef
    private Project project;


    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private String description;
}
