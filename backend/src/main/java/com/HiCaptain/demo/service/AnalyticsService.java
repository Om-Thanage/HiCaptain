package com.HiCaptain.demo.service;

import com.HiCaptain.demo.model.*;
import com.HiCaptain.demo.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AnalyticsService {
    @Autowired private ProjectService projects;
    @Autowired private TaskService tasks;
    @Autowired private TimeLogService timeLogs;
    @Autowired private InvoiceService invoices;
    @Autowired private MeetingService meetings;
    @Autowired private OrganizationService organizations;

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private TimeLogRepository timeLogRepository;

    @Autowired
    private InvoiceRepository invoiceRepository;

    @Autowired
    private MeetingRepository meetingRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private GitHubRepositoryRepository gitHubRepositoryRepository;

    @Autowired
    private GitHubCommitRepository gitHubCommitRepository;

    public Map<String, Object> getDashboardAnalytics(String userId, String userRole) {
        Map<String, Object> analytics = new HashMap<>();
        
        // Basic counts
        analytics.put("totalProjects", projects.getAll().size());
        analytics.put("totalTasks", tasks.getAll().size());
        analytics.put("totalUsers", organizations.members(organizations.currentOrgId()).size());
        analytics.put("totalMeetings", meetings.getAll().size());
        
        
        // Task statistics
        Map<String, Long> taskStats = getTaskStatistics();
        analytics.put("taskStats", taskStats);
        
        // Project statistics
        List<Map<String, Object>> projectStats = getProjectStatistics();
        analytics.put("projectStats", projectStats);
        
        // Recent activity
        List<Map<String, Object>> recentActivity = getRecentActivity();
        analytics.put("recentActivity", recentActivity);
        
        // Time tracking
        Map<String, Object> timeStats = getTimeTrackingStatistics();
        analytics.put("timeStats", timeStats);
        
        // Revenue statistics
        Map<String, Object> revenueStats = getRevenueStatistics();
        analytics.put("revenueStats", revenueStats);
        
        // GitHub statistics
        Map<String, Object> gitStats = getGitHubStatistics();
        analytics.put("gitStats", gitStats);
        
        // Meeting statistics
        Map<String, Object> meetingStats = getMeetingStatistics();
        analytics.put("meetingStats", meetingStats);

        return analytics;
    }

    private Map<String, Long> getTaskStatistics() {
        Map<String, Long> stats = new HashMap<>();
        List<Task> allTasks = tasks.getAll();
        
        stats.put("total", (long) allTasks.size());
        stats.put("completed", allTasks.stream().filter(task -> "completed".equals(task.getStatus())).count());
        stats.put("inProgress", allTasks.stream().filter(task -> "in-progress".equals(task.getStatus())).count());
        stats.put("todo", allTasks.stream().filter(task -> "todo".equals(task.getStatus())).count());
        stats.put("blocked", allTasks.stream().filter(task -> "blocked".equals(task.getStatus())).count());
        
        return stats;
    }

    private List<Map<String, Object>> getProjectStatistics() {
        List<Project> allProjects = projects.getAll();
        
        return allProjects.stream().map(project -> {
            Map<String, Object> projectStat = new HashMap<>();
            projectStat.put("id", project.getId());
            projectStat.put("name", project.getName());
            projectStat.put("status", project.getStatus());
            
            // Calculate completion percentage
            List<Task> projectTasks = tasks.getAll().stream().filter(item -> project.getId().equals(item.getProjectId())).toList();
            long completedTasks = projectTasks.stream().filter(task -> "completed".equals(task.getStatus())).count();
            double completionRate = projectTasks.isEmpty() ? 0 : (double) completedTasks / projectTasks.size() * 100;
            projectStat.put("completionRate", Math.round(completionRate * 100.0) / 100.0);
            
            projectStat.put("totalTasks", projectTasks.size());
            projectStat.put("client", project.getClientId());
            
            return projectStat;
        }).collect(Collectors.toList());
    }

    private List<Map<String, Object>> getRecentActivity() {
        List<Map<String, Object>> activities = new ArrayList<>();
        
        // Recent tasks
        List<Task> recentTasks = tasks.getAll().stream().sorted(Comparator.comparing(Task::getUpdatedAt, Comparator.nullsFirst(Comparator.naturalOrder())).reversed()).limit(10).toList();
        recentTasks.forEach(task -> {
            Map<String, Object> activity = new HashMap<>();
            activity.put("type", "task");
            activity.put("title", "Task: " + task.getTitle());
            activity.put("description", "Status changed to " + task.getStatus());
            activity.put("timestamp", task.getUpdatedAt());
            activity.put("userId", task.getAssigneeId());
            activities.add(activity);
        });
        
        // Recent commits
        List<GitHubCommit> recentCommits = gitHubCommitRepository.findTop10ByOrderByAuthorDateDesc().stream().filter(item -> projects.getById(item.getProjectId()).isPresent()).toList();
        recentCommits.forEach(commit -> {
            Map<String, Object> activity = new HashMap<>();
            activity.put("type", "commit");
            activity.put("title", "Commit: " + commit.getMessage().substring(0, Math.min(50, commit.getMessage().length())));
            activity.put("description", "by " + commit.getAuthorName());
            activity.put("timestamp", commit.getAuthorDate());
            activity.put("userId", commit.getAuthorUsername());
            activities.add(activity);
        });
        
        return activities.stream()
                .sorted((a, b) -> ((LocalDateTime) b.get("timestamp")).compareTo((LocalDateTime) a.get("timestamp")))
                .limit(20)
                .collect(Collectors.toList());
    }

    private Map<String, Object> getTimeTrackingStatistics() {
        Map<String, Object> stats = new HashMap<>();
        List<TimeLog> allTimeLogs = timeLogs.getAll();
        
        // Total hours logged
        int totalMinutes = allTimeLogs.stream()
                .mapToInt(timeLog -> (int)(timeLog.getHoursWorked() * 60))
                .sum();
        
        stats.put("totalHours", totalMinutes / 60);
        stats.put("totalMinutes", totalMinutes % 60);
        
        // Hours by project
        Map<String, Integer> hoursByProject = allTimeLogs.stream()
                .collect(Collectors.groupingBy(
                        TimeLog::getProjectId,
                        Collectors.summingInt(timeLog -> (int)(timeLog.getHoursWorked() * 60))
                ));
        
        stats.put("hoursByProject", hoursByProject);
        
        // Weekly hours (last 7 days)
        LocalDate weekAgo = LocalDate.now().minusDays(7);
        int weeklyMinutes = allTimeLogs.stream()
                .filter(timeLog -> timeLog.getDateLogged().isAfter(weekAgo))
                .mapToInt(timeLog -> (int)(timeLog.getHoursWorked() * 60))
                .sum();
        
        stats.put("weeklyHours", weeklyMinutes / 60);
        
        return stats;
    }

    private Map<String, Object> getRevenueStatistics() {
        Map<String, Object> stats = new HashMap<>();
        List<Invoice> allInvoices = invoices.getAll();
        
        // Total revenue
        double totalRevenue = allInvoices.stream()
                .mapToDouble(Invoice::getAmount)
                .sum();
        stats.put("totalRevenue", totalRevenue);
        
        // Paid vs Pending
        double paidAmount = allInvoices.stream()
                .filter(invoice -> "paid".equals(invoice.getStatus()))
                .mapToDouble(Invoice::getAmount)
                .sum();
        stats.put("paidAmount", paidAmount);
        
        double pendingAmount = allInvoices.stream()
                .filter(invoice -> "pending".equals(invoice.getStatus()))
                .mapToDouble(Invoice::getAmount)
                .sum();
        stats.put("pendingAmount", pendingAmount);
        
        // Monthly revenue
        Map<String, Double> monthlyRevenue = allInvoices.stream()
                .filter(invoice -> "paid".equals(invoice.getStatus()))
                .filter(invoice -> invoice.getDateIssued() != null)
                .collect(Collectors.groupingBy(
                        invoice -> invoice.getDateIssued().getMonth().toString(),
                        Collectors.summingDouble(Invoice::getAmount)
                ));
        stats.put("monthlyRevenue", monthlyRevenue);
        
        return stats;
    }

    private Map<String, Object> getGitHubStatistics() {
        Map<String, Object> stats = new HashMap<>();
        
        List<GitHubRepository> repositories = gitHubRepositoryRepository.findAll().stream().filter(item -> projects.getById(item.getProjectId()).isPresent()).toList();
        stats.put("totalRepositories", repositories.size());
        
        List<GitHubCommit> commits = gitHubCommitRepository.findAll().stream().filter(item -> projects.getById(item.getProjectId()).isPresent()).toList();
        stats.put("totalCommits", commits.size());
        
        // Commits this week
        LocalDateTime weekAgo = LocalDateTime.now().minusDays(7);
        long weeklyCommits = commits.stream()
                .filter(commit -> commit.getAuthorDate().isAfter(weekAgo))
                .count();
        stats.put("weeklyCommits", weeklyCommits);
        
        // Top contributors
        Map<String, Long> contributors = commits.stream()
                .collect(Collectors.groupingBy(
                        GitHubCommit::getAuthorName,
                        Collectors.counting()
                ));
        stats.put("topContributors", contributors);
        
        // Languages
        Map<String, Long> languages = repositories.stream()
                .filter(repo -> repo.getLanguage() != null)
                .collect(Collectors.groupingBy(
                        GitHubRepository::getLanguage,
                        Collectors.counting()
                ));
        stats.put("languages", languages);
        
        return stats;
    }

    private Map<String, Object> getMeetingStatistics() {
        Map<String, Object> stats = new HashMap<>();
        List<Meeting> allMeetings = meetings.getAll();
        
        stats.put("totalMeetings", allMeetings.size());
        
        // Upcoming meetings
        LocalDateTime now = LocalDateTime.now();
        long upcomingMeetings = allMeetings.stream()
                .filter(meeting -> meeting.getStartTime().isAfter(now))
                .count();
        stats.put("upcomingMeetings", upcomingMeetings);
        
        // Virtual vs In-person
        long virtualMeetings = allMeetings.stream()
                .filter(Meeting::isVirtual)
                .count();
        stats.put("virtualMeetings", virtualMeetings);
        stats.put("inPersonMeetings", allMeetings.size() - virtualMeetings);
        
        // Meetings by type
        Map<String, Long> meetingsByType = allMeetings.stream()
                .collect(Collectors.groupingBy(
                        Meeting::getType,
                        Collectors.counting()
                ));
        stats.put("meetingsByType", meetingsByType);
        
        return stats;
    }

    public List<Map<String, Object>> getProjectProgress() {
        List<Project> projects = this.projects.getAll();
        
        return projects.stream().map(project -> {
            Map<String, Object> progress = new HashMap<>();
            progress.put("projectId", project.getId());
            progress.put("projectName", project.getName());
            progress.put("status", project.getStatus());
            
            List<Task> tasks = this.tasks.getAll().stream().filter(item -> project.getId().equals(item.getProjectId())).toList();
            long completedTasks = tasks.stream().filter(task -> "completed".equals(task.getStatus())).count();
            double completionRate = tasks.isEmpty() ? 0 : (double) completedTasks / tasks.size() * 100;
            
            progress.put("totalTasks", tasks.size());
            progress.put("completedTasks", completedTasks);
            progress.put("completionPercentage", Math.round(completionRate * 100.0) / 100.0);
            
            return progress;
        }).collect(Collectors.toList());
    }

    public Map<String, Object> getUserProductivity(String userId) {
        Map<String, Object> productivity = new HashMap<>();
        
        List<Task> userTasks = tasks.getAll().stream().filter(item -> userId.equals(item.getAssigneeId())).toList();
        List<TimeLog> userTimeLogs = timeLogs.getAll().stream().filter(item -> userId.equals(item.getUserId())).toList();
        List<GitHubCommit> userCommits = gitHubCommitRepository.findByAuthorUsername(userId).stream().filter(item -> projects.getById(item.getProjectId()).isPresent()).toList();
        
        productivity.put("totalTasks", userTasks.size());
        productivity.put("completedTasks", userTasks.stream().filter(task -> "completed".equals(task.getStatus())).count());
        
        int totalMinutes = userTimeLogs.stream()
                .mapToInt(timeLog -> (int)(timeLog.getHoursWorked() * 60))
                .sum();
        productivity.put("totalHoursLogged", totalMinutes / 60);
        
        productivity.put("totalCommits", userCommits.size());
        
        return productivity;
    }

    public Map<String, Object> getProjectAnalytics(String projectId, String userId, String userRole) {
        Map<String, Object> analytics = new HashMap<>();
        
        Optional<Project> projectOpt = projects.getById(projectId);
        if (projectOpt.isEmpty()) {
            return analytics;
        }
        
        Project project = projectOpt.get();
        analytics.put("projectInfo", Map.of(
            "id", project.getId(),
            "name", project.getName(),
            "status", project.getStatus(),
            "description", project.getDescription()
        ));
        
        // Project tasks
        List<Task> projectTasks = tasks.getAll().stream().filter(item -> projectId.equals(item.getProjectId())).toList();
        Map<String, Long> taskStats = new HashMap<>();
        taskStats.put("total", (long) projectTasks.size());
        taskStats.put("completed", projectTasks.stream().filter(task -> "completed".equals(task.getStatus())).count());
        taskStats.put("inProgress", projectTasks.stream().filter(task -> "in-progress".equals(task.getStatus())).count());
        taskStats.put("todo", projectTasks.stream().filter(task -> "todo".equals(task.getStatus())).count());
        analytics.put("taskStats", taskStats);
        
        // Project time logs
        List<TimeLog> projectTimeLogs = timeLogs.getAll().stream().filter(item -> projectId.equals(item.getProjectId())).toList();
        int totalMinutes = projectTimeLogs.stream()
                .mapToInt(timeLog -> (int)(timeLog.getHoursWorked() * 60))
                .sum();
        analytics.put("totalHours", totalMinutes / 60);
        
        // Project revenue
        List<Invoice> projectInvoices = invoices.getAll().stream().filter(item -> projectId.equals(item.getProjectId())).toList();
        double totalRevenue = projectInvoices.stream().mapToDouble(Invoice::getAmount).sum();
        analytics.put("totalRevenue", totalRevenue);
        
        return analytics;
    }

    public Map<String, Object> getUserAnalytics(String userId) {
        Map<String, Object> analytics = new HashMap<>();
        
        Optional<User> userOpt = userRepository.findById(userId).filter(item -> organizations.membership(organizations.currentOrgId(), userId) != null);
        if (userOpt.isEmpty()) {
            return analytics;
        }
        
        User user = userOpt.get();
        analytics.put("userInfo", Map.of(
            "id", user.getId(),
            "name", user.getName(),
            "role", organizations.membership(organizations.currentOrgId(), userId).getRoles().iterator().next().name()
        ));
        
        // User tasks
        List<Task> userTasks = tasks.getAll().stream().filter(item -> userId.equals(item.getAssigneeId())).toList();
        Map<String, Long> taskStats = new HashMap<>();
        taskStats.put("total", (long) userTasks.size());
        taskStats.put("completed", userTasks.stream().filter(task -> "completed".equals(task.getStatus())).count());
        taskStats.put("inProgress", userTasks.stream().filter(task -> "in-progress".equals(task.getStatus())).count());
        taskStats.put("todo", userTasks.stream().filter(task -> "todo".equals(task.getStatus())).count());
        analytics.put("taskStats", taskStats);
        
        // User time logs
        List<TimeLog> userTimeLogs = timeLogs.getAll().stream().filter(item -> userId.equals(item.getUserId())).toList();
        int totalMinutes = userTimeLogs.stream()
                .mapToInt(timeLog -> (int)(timeLog.getHoursWorked() * 60))
                .sum();
        analytics.put("totalHours", totalMinutes / 60);
        
        // User commits
        List<GitHubCommit> userCommits = gitHubCommitRepository.findByAuthorUsername(userId).stream().filter(item -> projects.getById(item.getProjectId()).isPresent()).toList();
        analytics.put("totalCommits", userCommits.size());
        
        return analytics;
    }

    public List<Map<String, Object>> getRecentActivities(String userId, String userRole, int limit) {
        List<Map<String, Object>> activities = new ArrayList<>();
        
        // Filter activities based on user role
        if ("Admin".equals(userRole) || "ProjectManager".equals(userRole)) {
            // Show all activities for admin/PM
            activities.addAll(getRecentActivity());
        } else {
            // Show only user's activities for others
            List<Task> userTasks = tasks.getAll().stream().filter(item -> userId.equals(item.getAssigneeId())).toList();
            userTasks.stream().limit(limit).forEach(task -> {
                Map<String, Object> activity = new HashMap<>();
                activity.put("type", "task");
                activity.put("title", "Task: " + task.getTitle());
                activity.put("description", "Status: " + task.getStatus());
                activity.put("timestamp", task.getUpdatedAt());
                activity.put("userId", task.getAssigneeId());
                activities.add(activity);
            });
            
            List<GitHubCommit> userCommits = gitHubCommitRepository.findByAuthorUsernameOrderByAuthorDateDesc(userId).stream().filter(item -> projects.getById(item.getProjectId()).isPresent()).toList();
            userCommits.stream().limit(limit).forEach(commit -> {
                Map<String, Object> activity = new HashMap<>();
                activity.put("type", "commit");
                activity.put("title", "Commit: " + commit.getMessage().substring(0, Math.min(50, commit.getMessage().length())));
                activity.put("description", "Repository: " + commit.getRepositoryId());
                activity.put("timestamp", commit.getAuthorDate());
                activity.put("userId", commit.getAuthorUsername());
                activities.add(activity);
            });
        }
        
        return activities.stream()
                .sorted((a, b) -> ((LocalDateTime) b.get("timestamp")).compareTo((LocalDateTime) a.get("timestamp")))
                .limit(limit)
                .collect(Collectors.toList());
    }
}
