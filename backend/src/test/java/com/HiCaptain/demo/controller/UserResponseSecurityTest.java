package com.HiCaptain.demo.controller;
import com.HiCaptain.demo.model.User;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
class UserResponseSecurityTest {
    @Test void userSerializationNeverExposesPasswordOrSessionVersion() throws Exception {
        var user = new User(); user.setPassword("private-password-hash"); user.setSessionVersion(12L);
        String json = new ObjectMapper().writeValueAsString(user);
        assertFalse(json.contains("password")); assertFalse(json.contains("private-password-hash")); assertFalse(json.contains("sessionVersion"));
    }
    @Test void legacyPlaintextUserCreationEndpointIsAbsent() {
        for (var method : UserController.class.getDeclaredMethods()) {
            var post = method.getAnnotation(org.springframework.web.bind.annotation.PostMapping.class);
            if (post != null) assertTrue(post.value().length > 0 && !post.value()[0].isBlank(), "POST /users must not create raw persistence objects");
        }
    }
}
