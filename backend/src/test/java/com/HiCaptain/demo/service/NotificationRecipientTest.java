package com.HiCaptain.demo.service;
import com.HiCaptain.demo.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
class NotificationRecipientTest {
    @Test void notificationsCannotTargetPeopleOutsideTheActiveOrganization() {
        var organizations = mock(OrganizationService.class); var users = mock(UserRepository.class);
        var service = new NotificationService();
        ReflectionTestUtils.setField(service, "organizations", organizations); ReflectionTestUtils.setField(service, "userRepository", users);
        when(organizations.currentOrgId()).thenReturn("organization");
        when(organizations.membership("organization", "outsider")).thenThrow(new IllegalArgumentException("Forbidden"));
        assertThrows(Exception.class, () -> service.createNotification("outsider", "Title", "Message", "info", "system", "manual", null, null, null, "normal"));
        verifyNoInteractions(users);
    }
}
