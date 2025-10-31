package com.HiCaptain.demo.repository;

import com.HiCaptain.demo.model.Feedback;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface FeedbackRepository extends MongoRepository<Feedback, String> {
}
