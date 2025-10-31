package com.HiCaptain.demo.repository;

import com.HiCaptain.demo.model.TimeLog;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface TimeLogRepository extends MongoRepository<TimeLog, String> {
}
