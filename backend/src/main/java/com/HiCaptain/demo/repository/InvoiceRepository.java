package com.HiCaptain.demo.repository;

import com.HiCaptain.demo.model.Invoice;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface InvoiceRepository extends MongoRepository<Invoice, String> {
}
