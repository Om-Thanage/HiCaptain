package com.HiCaptain.demo.repository;

import com.HiCaptain.demo.model.SocialIdentity;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface SocialIdentityRepository extends MongoRepository<SocialIdentity, String> {
    Optional<SocialIdentity> findByProviderSubject(String providerSubject);
}
