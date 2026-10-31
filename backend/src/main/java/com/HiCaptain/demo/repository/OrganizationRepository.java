package com.HiCaptain.demo.repository;

import com.HiCaptain.demo.model.Organization;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface OrganizationRepository extends MongoRepository<Organization, String> {}
