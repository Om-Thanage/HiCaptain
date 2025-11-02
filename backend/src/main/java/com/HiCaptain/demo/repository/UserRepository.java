package com.HiCaptain.demo.repository;

import com.HiCaptain.demo.model.User;
import com.HiCaptain.demo.util.Role;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends MongoRepository<User, String> {
    Optional<User> findByName(String name);
    Optional<User> findByEmail(String email);
    List<User> findByRole(Role role);
}