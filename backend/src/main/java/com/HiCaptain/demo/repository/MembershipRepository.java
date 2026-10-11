package com.HiCaptain.demo.repository;

import com.HiCaptain.demo.model.Membership;
import java.util.List;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface MembershipRepository extends MongoRepository<Membership, String> {
    List<Membership> findByUserId(String userId);
    List<Membership> findByOrganizationId(String organizationId);
    Optional<Membership> findByOrganizationIdAndUserId(String organizationId, String userId);
}
