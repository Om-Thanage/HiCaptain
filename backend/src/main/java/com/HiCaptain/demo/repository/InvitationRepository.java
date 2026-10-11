package com.HiCaptain.demo.repository;

import com.HiCaptain.demo.model.Invitation;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface InvitationRepository extends MongoRepository<Invitation, String> {
    Optional<Invitation> findByTokenHash(String tokenHash);
}
