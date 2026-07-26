package com.HiCaptain.demo.config;

import com.HiCaptain.demo.model.Project;
import com.HiCaptain.demo.model.Task;
import com.HiCaptain.demo.model.User;
import com.HiCaptain.demo.repository.ProjectRepository;
import com.HiCaptain.demo.repository.TaskRepository;
import com.HiCaptain.demo.repository.UserRepository;
import com.HiCaptain.demo.util.Role;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Configuration
@RequiredArgsConstructor
@Slf4j
public class DataInitializer {

    private final UserRepository userRepository;
    private final ProjectRepository projectRepository;
    private final TaskRepository taskRepository;
    private final PasswordEncoder passwordEncoder;

    @Bean
    @Profile("!prod") // Don't run in production
    public CommandLineRunner initializeData() {
        return args -> {
            // Clear existing data
            log.info("Clearing existing data...");
            taskRepository.deleteAll();
            projectRepository.deleteAll();
            userRepository.deleteAll();
            log.info("Database cleared.");

            // Create users with realistic data
            log.info("Creating users...");
            
            // Admin
            User admin = createUser(
                "Sarah Mitchell",
                "sarah.mitchell@hicaptain.com",
                "admin123",
                Role.Admin
            );
            
            // Project Manager
            User pm = createUser(
                "Michael Chen",
                "michael.chen@hicaptain.com",
                "pm123",
                Role.ProjectManager
            );
            
            // Developers
            User dev1 = createUser(
                "Emma Thompson",
                "emma.thompson@hicaptain.com",
                "dev123",
                Role.Developer
            );
            
            User dev2 = createUser(
                "James Rodriguez",
                "james.rodriguez@hicaptain.com",
                "dev123",
                Role.Developer
            );
            
            User dev3 = createUser(
                "Priya Sharma",
                "priya.sharma@hicaptain.com",
                "dev123",
                Role.Developer
            );
            
            // Clients
            User client1 = createUser(
                "Robert Anderson",
                "robert.anderson@techcorp.com",
                "client123",
                Role.Client
            );
            
            User client2 = createUser(
                "Lisa Wang",
                "lisa.wang@fintech.io",
                "client123",
                Role.Client
            );

            log.info("Created {} users", 7);

            // Create realistic projects
            log.info("Creating projects...");
            
            // Project 1: E-Commerce Platform Redesign
            Project project1 = createProject(
                "E-Commerce Platform Redesign",
                "Complete overhaul of the customer-facing e-commerce platform with focus on mobile responsiveness and checkout optimization. Includes payment gateway integration and inventory management system.",
                "In Progress",
                LocalDate.of(2024, 1, 15),
                LocalDate.of(2024, 6, 30),
                client1.getId(),
                pm.getId(),
                "Admin : Sarah Mitchell",
                Arrays.asList(dev1.getId(), dev2.getId())
            );
            
            // Project 2: Mobile Banking App
            Project project2 = createProject(
                "Mobile Banking App",
                "Native iOS and Android mobile application for personal banking services including account management, fund transfers, bill payments, and investment tracking.",
                "In Progress",
                LocalDate.of(2024, 2, 1),
                LocalDate.of(2024, 8, 31),
                client2.getId(),
                pm.getId(),
                "Admin : Sarah Mitchell",
                Arrays.asList(dev2.getId(), dev3.getId())
            );
            
            // Project 3: HR Management System
            Project project3 = createProject(
                "HR Management System",
                "Internal HRMS for employee onboarding, attendance tracking, leave management, performance reviews, and payroll integration. Cloud-based solution with role-based access control.",
                "Planning",
                LocalDate.of(2024, 3, 1),
                LocalDate.of(2024, 12, 31),
                client1.getId(),
                pm.getId(),
                "Admin : Sarah Mitchell",
                Arrays.asList(dev1.getId(), dev3.getId())
            );

            log.info("Created {} projects", 3);

            // Create realistic tasks for Project 1
            log.info("Creating tasks...");
            
            List<Task> project1Tasks = Arrays.asList(
                createTask(
                    "Implement OAuth 2.0 Authentication",
                    "Set up OAuth 2.0 authentication flow with support for Google and Facebook login. Include JWT token generation and refresh token mechanism.",
                    "In Progress",
                    "High",
                    LocalDate.of(2024, 4, 15),
                    project1.getId(),
                    dev1.getId(),
                    Arrays.asList(dev1.getId()),
                    "Backend",
                    40,
                    25,
                    65.0
                ),
                createTask(
                    "Design Checkout Flow UI/UX",
                    "Create wireframes and high-fidelity mockups for the new 3-step checkout process. Focus on reducing cart abandonment with progress indicators and guest checkout option.",
                    "Completed",
                    "High",
                    LocalDate.of(2024, 3, 30),
                    project1.getId(),
                    dev2.getId(),
                    Arrays.asList(dev2.getId()),
                    "Frontend",
                    30,
                    32,
                    100.0
                ),
                createTask(
                    "Integrate Stripe Payment Gateway",
                    "Complete integration of Stripe API for credit card processing, including support for saved payment methods and subscription handling.",
                    "In Progress",
                    "Critical",
                    LocalDate.of(2024, 5, 1),
                    project1.getId(),
                    dev1.getId(),
                    Arrays.asList(dev1.getId(), dev2.getId()),
                    "Backend",
                    50,
                    30,
                    60.0
                ),
                createTask(
                    "Optimize Product Search Performance",
                    "Implement Elasticsearch for product catalog search with autocomplete, filters, and faceted search. Target <200ms response time for search queries.",
                    "To Do",
                    "Medium",
                    LocalDate.of(2024, 5, 15),
                    project1.getId(),
                    dev2.getId(),
                    Arrays.asList(dev2.getId()),
                    "Backend",
                    35,
                    0,
                    0.0
                ),
                createTask(
                    "Mobile Responsive Testing",
                    "Comprehensive testing across iOS Safari, Chrome Android, and Samsung Internet. Fix responsive layout issues and touch target sizing.",
                    "To Do",
                    "Medium",
                    LocalDate.of(2024, 6, 15),
                    project1.getId(),
                    dev2.getId(),
                    Arrays.asList(dev2.getId()),
                    "QA",
                    20,
                    0,
                    0.0
                )
            );

            // Tasks for Project 2
            List<Task> project2Tasks = Arrays.asList(
                createTask(
                    "Implement Biometric Authentication",
                    "Add Face ID and Touch ID support for iOS, and fingerprint authentication for Android. Implement secure enclave storage for sensitive data.",
                    "In Progress",
                    "Critical",
                    LocalDate.of(2024, 4, 30),
                    project2.getId(),
                    dev3.getId(),
                    Arrays.asList(dev3.getId()),
                    "Mobile",
                    45,
                    20,
                    45.0
                ),
                createTask(
                    "Build Transaction History Screen",
                    "Create transaction list view with filters (date range, category, amount), search functionality, and export to PDF feature.",
                    "Completed",
                    "High",
                    LocalDate.of(2024, 3, 15),
                    project2.getId(),
                    dev2.getId(),
                    Arrays.asList(dev2.getId()),
                    "Mobile",
                    25,
                    28,
                    100.0
                ),
                createTask(
                    "Integrate Push Notifications",
                    "Set up Firebase Cloud Messaging for transaction alerts, bill payment reminders, and account activity notifications with deep linking support.",
                    "To Do",
                    "High",
                    LocalDate.of(2024, 5, 30),
                    project2.getId(),
                    dev3.getId(),
                    Arrays.asList(dev3.getId()),
                    "Mobile",
                    30,
                    0,
                    0.0
                ),
                createTask(
                    "API Performance Optimization",
                    "Reduce API response times by implementing Redis caching, database query optimization, and API response compression.",
                    "In Progress",
                    "Medium",
                    LocalDate.of(2024, 5, 15),
                    project2.getId(),
                    dev2.getId(),
                    Arrays.asList(dev2.getId()),
                    "Backend",
                    35,
                    15,
                    40.0
                )
            );

            // Tasks for Project 3
            List<Task> project3Tasks = Arrays.asList(
                createTask(
                    "Design Database Schema",
                    "Create comprehensive ER diagram and database schema for employee records, attendance, leave management, and payroll modules.",
                    "Completed",
                    "Critical",
                    LocalDate.of(2024, 3, 20),
                    project3.getId(),
                    dev1.getId(),
                    Arrays.asList(dev1.getId()),
                    "Backend",
                    20,
                    22,
                    100.0
                ),
                createTask(
                    "Implement Role-Based Access Control",
                    "Set up RBAC system with roles for HR Admin, Manager, and Employee. Define permissions for each module and implement authorization middleware.",
                    "In Progress",
                    "Critical",
                    LocalDate.of(2024, 4, 30),
                    project3.getId(),
                    dev1.getId(),
                    Arrays.asList(dev1.getId(), dev3.getId()),
                    "Backend",
                    40,
                    15,
                    35.0
                ),
                createTask(
                    "Create Employee Onboarding Workflow",
                    "Build multi-step onboarding process including document upload, policy acknowledgment, and account provisioning automation.",
                    "To Do",
                    "High",
                    LocalDate.of(2024, 6, 30),
                    project3.getId(),
                    dev3.getId(),
                    Arrays.asList(dev3.getId()),
                    "Full Stack",
                    50,
                    0,
                    0.0
                )
            );

            taskRepository.saveAll(project1Tasks);
            taskRepository.saveAll(project2Tasks);
            taskRepository.saveAll(project3Tasks);

            log.info("Created {} tasks", project1Tasks.size() + project2Tasks.size() + project3Tasks.size());
            log.info("=== Data initialization completed successfully ===");
            log.info("Login credentials:");
            log.info("  Admin: sarah.mitchell@hicaptain.com / admin123");
            log.info("  PM: michael.chen@hicaptain.com / pm123");
            log.info("  Dev: emma.thompson@hicaptain.com / dev123");
            log.info("  Dev: james.rodriguez@hicaptain.com / dev123");
            log.info("  Dev: priya.sharma@hicaptain.com / dev123");
            log.info("  Client: robert.anderson@techcorp.com / client123");
            log.info("  Client: lisa.wang@fintech.io / client123");
        };
    }

    private User createUser(String name, String email, String password, Role role) {
        User user = new User();
        user.setName(name);
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(password));
        user.setRole(role);
        user.setProjectIds(new ArrayList<>());
        user.setTaskIds(new ArrayList<>());
        return userRepository.save(user);
    }

    private Project createProject(String name, String description, String status,
                                 LocalDate startDate, LocalDate endDate, String clientId,
                                 String projectManagerId, String createdBy, List<String> developerIds) {
        Project project = new Project();
        project.setName(name);
        project.setDescription(description);
        project.setStatus(status);
        project.setStartDate(startDate);
        project.setEndDate(endDate);
        project.setClientId(clientId);
        project.setProjectManagerId(projectManagerId);
        project.setCreatedBy(createdBy);
        project.setDeveloperIds(developerIds);
        project.setTaskIds(new ArrayList<>());
        project.setFeedbackIds(new ArrayList<>());
        project.setInvoiceIds(new ArrayList<>());
        project.setMeetingIds(new ArrayList<>());
        project.setPaymentIds(new ArrayList<>());
        project.setTimeLogIds(new ArrayList<>());
        return projectRepository.save(project);
    }

    private Task createTask(String title, String description, String status, String priority,
                           LocalDate deadline, String projectId, String assigneeId,
                           List<String> assignedDeveloperIds, String category,
                           int estimatedHours, int actualHours, double progress) {
        Task task = new Task();
        task.setTitle(title);
        task.setDescription(description);
        task.setStatus(status);
        task.setPriority(priority);
        task.setDeadline(deadline);
        task.setProjectId(projectId);
        task.setAssigneeId(assigneeId);
        task.setAssignedDeveloperIds(assignedDeveloperIds);
        task.setCategory(category);
        task.setEstimatedHours(estimatedHours);
        task.setActualHours(actualHours);
        task.setProgress(progress);
        task.setCreatedAt(LocalDateTime.now().minusDays(30));
        task.setUpdatedAt(LocalDateTime.now().minusDays(1));
        return taskRepository.save(task);
    }
}
