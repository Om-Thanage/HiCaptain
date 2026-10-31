package com.HiCaptain.demo.service;

import com.HiCaptain.demo.model.User;
import com.HiCaptain.demo.repository.UserRepository;
import java.util.Optional;
import org.springframework.stereotype.Service;

@Service
public class UserService {
    private final UserRepository users;
    public UserService(UserRepository users) { this.users = users; }
    public Optional<User> getById(String id) { return users.findById(id); }
}
