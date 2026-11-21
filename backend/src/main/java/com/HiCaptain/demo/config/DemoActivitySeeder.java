package com.HiCaptain.demo.config;

import com.HiCaptain.demo.agent.AgentModels.Agent;
import com.HiCaptain.demo.agent.AgentModels.Memory;
import com.HiCaptain.demo.agent.AgentModels.Provider;
import com.HiCaptain.demo.model.Feedback;
import com.HiCaptain.demo.model.GitHubCommit;
import com.HiCaptain.demo.model.GitHubPullRequest;
import com.HiCaptain.demo.model.Meeting;
import com.HiCaptain.demo.model.Project;
import com.HiCaptain.demo.model.User;
import com.HiCaptain.demo.util.Role;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Set;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Component;

/**
 * Demo-only project activity: client feedback, meetings, repository history, approved
 * decisions and AI teammates. Called by DataInitializer under the "demo" profile, after the
 * database has been emptied, so the context engine and orchestrator have real material.
 */
@Component
@Slf4j
public class DemoActivitySeeder {
  private final MongoTemplate mongo;
  private final String ollamaModel;
  private final String ollamaOrigin;

  public DemoActivitySeeder(
      MongoTemplate mongo,
      @Value("${DEMO_OLLAMA_MODEL:qwen3:8b}") String ollamaModel,
      @Value("${DEMO_OLLAMA_ORIGIN:http://localhost:11434}") String ollamaOrigin) {
    this.mongo = mongo;
    this.ollamaModel = ollamaModel;
    this.ollamaOrigin = ollamaOrigin;
  }

  public void seed(
      String org,
      User admin,
      User pm,
      List<User> devs,
      List<User> clients,
      List<Project> projects) {
    Project shop = projects.get(0), bank = projects.get(1), hr = projects.get(2);
    User emma = devs.get(0), james = devs.get(1), priya = devs.get(2);
    LocalDateTime now = LocalDateTime.now().withSecond(0).withNano(0);

    feedback(shop, clients.get(0), 12, "open",
        "Checkout times out on mobile when paying with a saved card. Customers see a spinner for about 30 seconds and then an error.");
    feedback(shop, clients.get(0), 6, "open",
        "Please keep guest checkout. Most of our holiday buyers never create an account.");
    feedback(shop, clients.get(0), 2, "in-progress",
        "Product search feels slow on the category pages with more than 500 items.");
    feedback(bank, clients.get(1), 9, "open",
        "Face ID login should fall back to the PIN after three failed attempts.");
    feedback(bank, clients.get(1), 3, "resolved",
        "Transaction history now loads quickly. Thank you.");
    feedback(hr, clients.get(0), 4, "open",
        "Onboarding must collect tax forms before the first payroll run.");

    meeting(shop, pm, List.of(emma, james), now.minusDays(14).withHour(10), "completed", "planning",
        "Sprint 6 planning", "Scope checkout redesign, Stripe integration and search performance for this sprint.");
    meeting(shop, pm, List.of(emma, james), now.minusDays(3).withHour(15), "completed", "review",
        "Client review: checkout",
        "Robert reported payment timeouts on mobile. Agreed to keep guest checkout and to target a 45 second payment timeout.");
    meeting(shop, pm, List.of(emma, james), now.plusDays(2).withHour(11), "scheduled", "standup",
        "Release readiness check", "Confirm payment retries, load test results and rollback plan before release.");
    meeting(bank, pm, List.of(james, priya), now.minusDays(5).withHour(12), "completed", "review",
        "Security review: biometrics", "Reviewed biometric fallback rules and secure storage of refresh tokens.");

    int sha = 0;
    for (Object[] c :
        new Object[][] {
          {shop, emma, 20, "Add OAuth refresh token rotation", 180},
          {shop, james, 16, "Build three-step checkout layout", 420},
          {shop, james, 11, "Add guest checkout path", 210},
          {shop, emma, 8, "Wrap Stripe payment intent creation in a service", 260},
          {shop, emma, 4, "Log payment gateway latency per request", 60},
          {shop, james, 2, "Cache category product counts", 95},
          {shop, emma, 1, "Raise payment request timeout to 45 seconds", 12},
          {bank, priya, 9, "Add biometric prompt on iOS", 310},
          {bank, james, 6, "Paginate transaction history API", 150},
          {bank, priya, 2, "Store refresh token in the secure keychain", 75},
          {hr, priya, 5, "Draft employee and document schema", 200},
        }) commit((Project) c[0], (User) c[1], now.minusDays((int) c[2]), (String) c[3], (int) c[4], ++sha);

    pullRequest(shop, james, 41, "Guest checkout", "Adds guest checkout and keeps the account path optional.",
        "closed", true, now.minusDays(10));
    pullRequest(shop, emma, 44, "Stripe payment service",
        "Moves payment intent creation into a service with retries. Needs a decision on the timeout value.",
        "open", false, now.minusDays(1));
    pullRequest(bank, priya, 17, "Biometric login", "Face ID and fingerprint login with PIN fallback.",
        "open", false, now.minusDays(2));

    memory(org, shop, pm, 9, "Guest checkout stays available; account creation is optional after purchase.");
    memory(org, shop, pm, 3, "The payment request timeout is 45 seconds, with one automatic retry for network errors only.");
    memory(org, bank, pm, 5, "Biometric login falls back to the PIN after three failed attempts.");

    Provider ollama = new Provider();
    ollama.setId("demo-ollama");
    ollama.setOrganizationId(org);
    ollama.setName("Local Ollama");
    ollama.setKind("ollama");
    ollama.setModel(ollamaModel);
    ollama.setBaseUrl(ollamaOrigin);
    ollama.setEnabled(true);
    ollama.setRemainingTokens(1_000_000);
    ollama.setReservations(new HashMap<>());
    mongo.insert(ollama);

    for (Project project : projects) {
      agent(org, project, "Release planner", "planner", "engine", null, null, 10000, 2000,
          "Plan practical next steps. Preserve approved decisions, explain uncertainties, and propose tasks with clear acceptance criteria.");
      agent(org, project, "Captain", "orchestrator", "planned", "demo-ollama", 3, 12000, 4000,
          "Split the work across frontend, backend, testing and deployment specialists, then merge their proposals into one reviewable plan.");
    }
    log.info(
        "Seeded feedback, meetings, commits, pull requests, project memory and AI teammates (Ollama model {})",
        ollamaModel);
  }

  private void feedback(Project project, User client, int daysAgo, String status, String message) {
    Feedback f = new Feedback();
    f.setProjectId(project.getId());
    f.setUserId(client.getId());
    f.setStatus(status);
    f.setMessage(message);
    f.setDateIssued(LocalDate.now().minusDays(daysAgo));
    mongo.insert(f);
  }

  private void meeting(
      Project project,
      User organizer,
      List<User> attendees,
      LocalDateTime start,
      String status,
      String type,
      String title,
      String agenda) {
    Meeting m = new Meeting();
    m.setProjectId(project.getId());
    m.setOrganizerId(organizer.getId());
    m.setAttendeeIds(attendees.stream().map(User::getId).toList());
    m.setAttendeeEmails(attendees.stream().map(User::getEmail).toList());
    m.setTitle(title);
    m.setAgenda(agenda);
    m.setDescription(agenda);
    m.setStartTime(start);
    m.setEndTime(start.plusMinutes(45));
    m.setTimeZone("Asia/Kolkata");
    m.setVirtual(true);
    m.setPriority("medium");
    m.setType(type);
    m.setStatus(status);
    m.setCreatedAt(start.minusDays(2));
    mongo.insert(m);
  }

  private void commit(Project project, User author, LocalDateTime at, String message, int lines, int n) {
    GitHubCommit c = new GitHubCommit();
    c.setSha(String.format("%040x", n * 7919L));
    c.setMessage(message);
    c.setAuthorName(author.getName());
    c.setAuthorEmail(author.getEmail());
    c.setAuthorUsername(author.getName().split(" ")[0].toLowerCase());
    c.setAuthorDate(at);
    c.setCommitterDate(at);
    c.setRepositoryName("hicaptain-demo/" + slug(project));
    c.setBranch("main");
    c.setTotalChanges(lines);
    c.setAdditions(lines * 2 / 3);
    c.setDeletions(lines / 3);
    c.setProjectId(project.getId());
    c.setCreatedAt(at);
    mongo.insert(c);
  }

  private void pullRequest(
      Project project, User author, int number, String title, String body, String state,
      boolean merged, LocalDateTime updated) {
    GitHubPullRequest pr = new GitHubPullRequest();
    pr.setGithubPrId("demo-" + slug(project) + "-" + number);
    pr.setNumber(number);
    pr.setTitle(title);
    pr.setBody(body);
    pr.setState(state);
    pr.setMerged(merged);
    pr.setAuthorName(author.getName());
    pr.setAuthorUsername(author.getName().split(" ")[0].toLowerCase());
    pr.setRepositoryName("hicaptain-demo/" + slug(project));
    pr.setBaseBranch("main");
    pr.setHeadBranch(title.toLowerCase().replace(' ', '-'));
    pr.setProjectId(project.getId());
    pr.setCreatedAt(updated.minusDays(2));
    pr.setUpdatedAt(updated);
    if (merged) pr.setMergedAt(updated);
    mongo.insert(pr);
  }

  private void memory(String org, Project project, User approver, int daysAgo, String content) {
    Memory m = new Memory();
    m.setOrganizationId(org);
    m.setProjectId(project.getId());
    m.setContent(content);
    m.setApprovedBy(approver.getId());
    m.setCreatedAt(Instant.now().minus(daysAgo, ChronoUnit.DAYS));
    mongo.insert(m);
  }

  private void agent(
      String org, Project project, String name, String specialty, String method, String worker,
      Integer maxWorkers, int maxInput, int maxOutput, String instructions) {
    Agent a = new Agent();
    a.setId("demo-" + specialty + "-" + project.getId());
    a.setOrganizationId(org);
    a.setProjectId(project.getId());
    a.setName(name);
    a.setSpecialty(specialty);
    a.setContextMethod(method);
    a.setProviderId("demo-ollama");
    a.setWorkerProviderId(worker);
    a.setMaxWorkers(maxWorkers);
    a.setAllowedRoles(Set.of(Role.Admin, Role.ProjectManager, Role.Developer));
    a.setEnabled(true);
    a.setMaxInputTokens(maxInput);
    a.setMaxOutputTokens(maxOutput);
    a.setInstructions(instructions);
    mongo.insert(a);
  }

  private static String slug(Project project) {
    return project.getName().toLowerCase().replaceAll("[^a-z0-9]+", "-");
  }
}
