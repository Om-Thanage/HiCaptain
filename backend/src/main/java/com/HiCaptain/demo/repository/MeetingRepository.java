package com.HiCaptain.demo.repository;

import com.HiCaptain.demo.model.Meeting;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface MeetingRepository extends MongoRepository<Meeting, String> {
}
