package com.HiCaptain.demo.repository;

import com.HiCaptain.demo.model.SocialLoginTicket;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface SocialLoginTicketRepository extends MongoRepository<SocialLoginTicket, String> {
    Optional<SocialLoginTicket> findByTokenHash(String tokenHash);
}
