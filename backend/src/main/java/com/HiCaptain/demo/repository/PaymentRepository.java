package com.HiCaptain.demo.repository;

import com.HiCaptain.demo.model.Payment;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface PaymentRepository extends MongoRepository<Payment, String> {
}
