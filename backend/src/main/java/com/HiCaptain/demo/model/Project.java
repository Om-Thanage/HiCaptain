package com.HiCaptain.demo.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDate;
import java.util.List;

@Document(collection = "projects")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class Project {

    @Id
    private String id;

    private String name;
    private String description;
    private String status;
    private LocalDate startDate;
    private LocalDate endDate;
    private String clientId;
    private List<String> developerIds;
    private List<String> taskIds;

    // ...existing code...
    // New aggregates maintained automatically by services
    private List<String> feedbackIds;
    private List<String> invoiceIds;
    private List<String> meetingIds;
    private List<String> paymentIds;
    private List<String> timeLogIds;
}
