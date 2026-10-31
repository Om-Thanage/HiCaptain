package com.HiCaptain.demo.service;
import com.HiCaptain.demo.model.User;
import com.HiCaptain.demo.repository.UserRepository;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
class AccountSecurityServiceTest {
    @Test void wrongCurrentPasswordCannotChangeTheAccount() {
        var users = mock(UserRepository.class); var mongo = mock(MongoTemplate.class); var encoder = new BCryptPasswordEncoder();
        var user = new User(); user.setPassword(encoder.encode("current-pass"));
        when(users.findById("user")).thenReturn(Optional.of(user));
        var service = new AccountSecurityService(users, mongo, encoder);
        assertThrows(Exception.class, () -> service.changePassword("user", "incorrect", "new-password"));
        verifyNoInteractions(mongo);
    }
    @Test void newPasswordIsHashedAndOldSessionsAreInvalidatedAtomically() {
        var users = mock(UserRepository.class); var mongo = mock(MongoTemplate.class); var encoder = new BCryptPasswordEncoder();
        var user = new User(); user.setPassword(encoder.encode("current-pass"));
        when(users.findById("user")).thenReturn(Optional.of(user));
        when(mongo.findAndModify(any(), any(), any(org.springframework.data.mongodb.core.FindAndModifyOptions.class), eq(User.class))).thenReturn(user);
        new AccountSecurityService(users, mongo, encoder).changePassword("user", "current-pass", "new-password");
        var update = ArgumentCaptor.forClass(Update.class);
        verify(mongo).findAndModify(any(), update.capture(), any(org.springframework.data.mongodb.core.FindAndModifyOptions.class), eq(User.class));
        var fields = update.getValue().getUpdateObject();
        assertTrue(encoder.matches("new-password", ((org.bson.Document) fields.get("$set")).getString("password")));
        assertEquals(1L, ((org.bson.Document) fields.get("$inc")).get("sessionVersion"));
    }
}
