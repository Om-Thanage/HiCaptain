package com.HiCaptain.demo.config;

import com.HiCaptain.demo.repository.*;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class DataInitializerTest {
    @Test void destructiveSeedingRequiresAnExplicitDemoProfile() throws Exception {
        assertArrayEquals(new String[]{"demo"}, DataInitializer.class.getMethod("initializeData").getAnnotation(Profile.class).value());
    }
    @Test void demoProfileCannotClearANormalDatabase() {
        var users = mock(UserRepository.class); var projects = mock(ProjectRepository.class);
        var tasks = mock(TaskRepository.class); var orgs = mock(OrganizationRepository.class);
        var memberships = mock(MembershipRepository.class);
        var initializer = new DataInitializer(users, projects, tasks, mock(PasswordEncoder.class), orgs, memberships);
        ReflectionTestUtils.setField(initializer, "database", "hicaptain");
        assertThrows(IllegalStateException.class, () -> initializer.initializeData().run());
        verifyNoInteractions(users, projects, tasks, orgs, memberships);
    }
}
