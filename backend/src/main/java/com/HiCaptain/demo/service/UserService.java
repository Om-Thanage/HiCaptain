package com.HiCaptain.demo.service;

import com.HiCaptain.demo.model.User;
import com.HiCaptain.demo.util.Role;
import com.HiCaptain.demo.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

@Service
public class UserService {

   @Autowired private UserRepository userRepository;
   @Autowired private PasswordEncoder passwordEncoder;

   public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

   public User save(User user){
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        return userRepository.save(user);
    }

    public Optional<User> findByName(String name){
        return userRepository.findByName(name);
    }

    public Optional<User> findByEmail(String email){
        return userRepository.findByEmail(email);
    }

    public List<User> getAll() {
        return userRepository.findAll();
    }

    public Optional<User> getById(String id) {
        return userRepository.findById(id);
    }

    public User create(User user) {
        return userRepository.save(user);
    }

    public List<User> getByRole(Role role) {
        if (role == null) return getAll();
        return userRepository.findByRole(role);
    }

    public User update(String id, User payload) {
        // Ensure the user exists before updating
        User existingUser = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        
        // Update only the fields that are provided in the payload
        if (payload.getName() != null) {
            existingUser.setName(payload.getName());
        }
        if (payload.getEmail() != null) {
            existingUser.setEmail(payload.getEmail());
        }
        if (payload.getPassword() != null && !payload.getPassword().isEmpty()) {
            existingUser.setPassword(passwordEncoder.encode(payload.getPassword()));
        }
        if (payload.getRole() != null) {
            existingUser.setRole(payload.getRole());
        }
        if (payload.getProjectIds() != null) {
            existingUser.setProjectIds(payload.getProjectIds());
        }
        if (payload.getTaskIds() != null) {
            existingUser.setTaskIds(payload.getTaskIds());
        }
        
        return userRepository.save(existingUser);
    }

    public void delete(String id) {
        if (!userRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found");
        }
        userRepository.deleteById(id);
    }
}