package com.HiCaptain.demo.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDate;

@Document(collection = "feedbacks")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class Feedback {

    @Id
    private String id;

    private String message;
    private String status;
    private LocalDate dateIssued;

    private String userId;
    private String projectId;
}
