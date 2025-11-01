package com.HiCaptain.demo.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDate;
import java.util.List;

@Document(collection = "invoices")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class Invoice {

    @Id
    private String id;

    private double amount;
    private String status;
    private LocalDate dateIssued;
    private LocalDate issueDate; // For compatibility with analytics
    private LocalDate dueDate;

    private String projectId;
    private String clientId;
    private String invoiceNumber;
    private String description;
    private double taxAmount;
    private double totalAmount;
    private String currency;
    
    private List<String> paymentIds;
}
