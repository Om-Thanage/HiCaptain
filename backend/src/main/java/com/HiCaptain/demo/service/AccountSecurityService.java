package com.HiCaptain.demo.service;
import com.HiCaptain.demo.model.User;
import com.HiCaptain.demo.repository.UserRepository;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.query.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
@Service
public class AccountSecurityService {
    private final UserRepository users;
    private final MongoTemplate mongo;
    private final PasswordEncoder passwords;
    public AccountSecurityService(UserRepository users, MongoTemplate mongo, PasswordEncoder passwords) {
        this.users = users; this.mongo = mongo; this.passwords = passwords;
    }
    public User changePassword(String userId, String currentPassword, String newPassword) {
        User user = users.findById(userId).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        if (!passwords.matches(currentPassword, user.getPassword())) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Current password is incorrect");
        if (newPassword.getBytes(java.nio.charset.StandardCharsets.UTF_8).length > 72)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password must fit within 72 UTF-8 bytes");
        User updated = mongo.findAndModify(Query.query(Criteria.where("_id").is(userId).and("password").is(user.getPassword())),
                new Update().set("password", passwords.encode(newPassword)).inc("sessionVersion", 1L),
                FindAndModifyOptions.options().returnNew(true), User.class);
        if (updated == null) throw new ResponseStatusException(HttpStatus.CONFLICT, "Account changed. Sign in again.");
        return updated;
    }
}
