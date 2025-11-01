package com.HiCaptain.demo.repository;

import com.HiCaptain.demo.model.Invoice;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface InvoiceRepository extends MongoRepository<Invoice, String> {
    List<Invoice> findByProjectId(String projectId);
}
