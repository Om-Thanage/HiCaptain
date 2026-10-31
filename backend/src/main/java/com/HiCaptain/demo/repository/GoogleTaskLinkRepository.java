package com.HiCaptain.demo.repository;

import com.HiCaptain.demo.model.GoogleTaskLink;
import java.util.List;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface GoogleTaskLinkRepository extends MongoRepository<GoogleTaskLink, String> {
    List<GoogleTaskLink> findByUserIdAndProjectId(String userId, String projectId);
}
