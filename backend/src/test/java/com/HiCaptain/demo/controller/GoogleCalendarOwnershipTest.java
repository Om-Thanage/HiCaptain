package com.HiCaptain.demo.controller;
import com.HiCaptain.demo.service.GoogleCalendarService;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
class GoogleCalendarOwnershipTest {
    @Test void anotherUsersCalendarCannotBeReadOrRevoked() {
        var controller = new GoogleCalendarController(); var google = mock(GoogleCalendarService.class);
        ReflectionTestUtils.setField(controller, "googleCalendarService", google);
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("caller", ""));
        try {
            assertThrows(Exception.class, () -> controller.getUpcomingEvents("victim", 10));
            assertThrows(Exception.class, () -> controller.revokeAuthorization("victim"));
            verifyNoInteractions(google);
        } finally { SecurityContextHolder.clearContext(); }
    }
}
