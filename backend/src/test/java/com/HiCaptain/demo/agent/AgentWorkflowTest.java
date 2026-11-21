package com.HiCaptain.demo.agent;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;

import com.HiCaptain.demo.agent.AgentModels.*;
import com.HiCaptain.demo.model.*;
import com.HiCaptain.demo.repository.*;
import com.HiCaptain.demo.service.JwtService;
import com.HiCaptain.demo.util.Role;
import com.fasterxml.jackson.databind.*;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.*;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

@SpringBootTest(
    properties = {
      "spring.data.mongodb.database=hicaptain_automated_tests",
      "provider.token-key=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
      "AGENT_WORKER_SECRET=synthetic-worker-key-at-least-32-characters"
    })
@ActiveProfiles("test")
@AutoConfigureMockMvc
class AgentWorkflowTest {
  static final String SECRET = "synthetic-worker-key-at-least-32-characters";
  @Autowired MockMvc mvc;
  @Autowired ObjectMapper json;
  @Autowired MongoTemplate mongo;
  @Autowired UserRepository users;
  @Autowired MembershipRepository memberships;
  @Autowired ProjectRepository projects;
  @Autowired TaskRepository tasks;
  @Autowired JwtService jwt;
  String org, project, admin, dev, outsider, manager, provider, agent, devId, memberId;

  @BeforeEach
  void seed() throws Exception {
    assertTrue(mongo.getDb().getName().endsWith("_tests"), "Only use a dedicated test database");
    for (Class<?> type : List.of(Run.class, Agent.class, Provider.class, Memory.class))
      mongo.remove(new Query(), type);
    org = "agent-test-" + UUID.randomUUID();
    admin = member("admin", org, Set.of(Role.Admin));
    dev = member("developer", org, Set.of(Role.Developer));
    outsider = member("outsider", org + "-foreign", Set.of(Role.Admin));
    manager = member("manager", org, Set.of(Role.ProjectManager));
    Project p = new Project();
    p.setOrganizationId(org);
    p.setName("Agent workflow");
    p.setDescription("Release project");
    p.setStatus("in-progress");
    p.setStartDate(LocalDate.now());
    p.setEndDate(LocalDate.now().plusDays(30));
    p.setDeveloperIds(List.of(devId));
    p.setProjectManagerId(memberId);
    project = projects.insert(p).getId();
    provider =
        request(post("/api/agents/providers"), admin, providerBody(), 200).path("id").asText();
    agent =
        request(
                post(path("")),
                admin,
                Map.of(
                    "name",
                    "Planner",
                    "specialty",
                    "planner",
                    "instructions",
                    "Plan release tasks",
                    "providerId",
                    provider,
                    "allowedRoles",
                    List.of("Admin", "Developer"),
                    "enabled",
                    true,
                    "maxInputTokens",
                    10000,
                    "maxOutputTokens",
                    2000),
                200)
            .path("id")
            .asText();
  }

  @AfterEach
  void cleanup() {
    mongo.remove(Query.query(Criteria.where("organizationId").is(org)), Project.class);
    for (Membership m : memberships.findByOrganizationId(org)) {
      users.deleteById(m.getUserId());
      memberships.delete(m);
    }
    for (Membership m : memberships.findByOrganizationId(org + "-foreign")) {
      users.deleteById(m.getUserId());
      memberships.delete(m);
    }
  }

  String member(String name, String organization, Set<Role> roles) {
    User u = new User();
    u.setName(name);
    u.setEmail(UUID.randomUUID() + "@example.com");
    u = users.insert(u);
    memberId = u.getId();
    if (name.equals("developer")) devId = u.getId();
    Membership m = new Membership();
    m.setUserId(u.getId());
    m.setOrganizationId(organization);
    m.setRoles(roles);
    memberships.insert(m);
    return jwt.generateToken(u, m);
  }

  Map<String, Object> providerBody() {
    return Map.of(
        "name",
        "Local model",
        "kind",
        "ollama",
        "model",
        "fixture",
        "baseUrl",
        "http://localhost:11434",
        "enabled",
        true,
        "remainingTokens",
        50000,
        "inputPrice",
        0,
        "outputPrice",
        0);
  }

  String path(String suffix) {
    return "/api/agents/projects/" + project + suffix;
  }

  JsonNode request(MockHttpServletRequestBuilder builder, String token, Object body, int expected)
      throws Exception {
    if (token != null) builder.header("Authorization", "Bearer " + token);
    if (body != null)
      builder.contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsBytes(body));
    var response = mvc.perform(builder).andReturn().getResponse();
    assertEquals(expected, response.getStatus(), response.getContentAsString());
    return response.getContentAsByteArray().length == 0
        ? json.nullNode()
        : json.readTree(response.getContentAsByteArray());
  }

  JsonNode worker(MockHttpServletRequestBuilder builder, String lease, Object body, int expected)
      throws Exception {
    builder.header("X-Agent-Worker-Key", SECRET);
    if (lease != null) builder.header("X-Agent-Run-Token", lease);
    return request(builder, null, body, expected);
  }

  JsonNode assign(String token, String instruction, String parent) throws Exception {
    var body = new HashMap<String, Object>();
    body.put("agentId", agent);
    body.put("instruction", instruction);
    if (parent != null) body.put("parentId", parent);
    return request(post(path("/runs")), token, body, 200);
  }

  JsonNode claim() throws Exception {
    return worker(post("/internal/agents/claim"), null, null, 200);
  }

  JsonNode output() {
    return json.valueToTree(
        Map.of(
            "summary",
            "Release plan",
            "tasks",
            List.of(
                Map.of(
                    "title",
                    "Verify release",
                    "description",
                    "Run checks",
                    "acceptanceCriteria",
                    "All checks pass",
                    "priority",
                    "high")),
            "decisions",
            List.of("Release only after review"),
            "questions",
            List.of("Which date?")));
  }

  JsonNode ready(String instruction) throws Exception {
    JsonNode run = assign(dev, instruction, null), job = claim();
    assertEquals(run.path("id").asText(), job.path("runId").asText());
    String id = job.path("runId").asText(), lease = job.path("token").asText();
    JsonNode context = worker(get("/internal/agents/" + id + "/context"), lease, null, 200);
    worker(
        post("/internal/agents/" + id + "/begin"),
        lease,
        Map.of("contextHash", context.path("contextHash").asText()),
        200);
    worker(
        post("/internal/agents/" + id + "/complete"),
        lease,
        Map.of("output", output(), "inputTokens", 100, "outputTokens", 50, "usageEstimated", false),
        200);
    return run;
  }

  @Test
  void encryptedKeysAndRbacNeverLeakCredentials() throws Exception {
    var body = new HashMap<>(providerBody());
    body.put("kind", "openai");
    body.put("apiKey", "synthetic-test-key");
    JsonNode p = request(post("/api/agents/providers"), admin, body, 200);
    assertFalse(p.has("encryptedKey"));
    assertFalse(p.has("apiKey"));
    assertFalse(p.has("reservations"));
    assertTrue(
        mongo.findById(p.path("id").asText(), Provider.class).getEncryptedKey().startsWith("v1:"));
    request(get("/api/agents/providers"), dev, null, 403);
    request(post("/api/agents/providers"), dev, body, 403);
    request(get(path("")), outsider, null, 404);
    request(get(path("/choices")), dev, null, 200);
    request(
        post(path("")),
        dev,
        Map.of(
            "name",
            "Bad",
            "specialty",
            "planner",
            "instructions",
            "test",
            "providerId",
            provider,
            "allowedRoles",
            List.of("Developer"),
            "enabled",
            true,
            "maxInputTokens",
            10000,
            "maxOutputTokens",
            2000),
        403);
    request(post("/internal/agents/claim"), null, null, 401);
  }

  @Test
  void approvalCreatesTasksAndMemoryOnceAndFollowupKeepsOriginalGoal() throws Exception {
    JsonNode run = ready("Prepare the release");
    String id = run.path("id").asText();
    assertEquals(
        0, mongo.count(Query.query(Criteria.where("projectId").is(project)), Memory.class));
    request(post(path("/runs/" + id + "/review")), dev, Map.of("accept", true), 403);
    JsonNode approved =
        request(post(path("/runs/" + id + "/review")), manager, Map.of("accept", true), 200);
    assertEquals("APPROVED", approved.path("status").asText());
    request(post(path("/runs/" + id + "/review")), admin, Map.of("accept", true), 200);
    List<Task> created = tasks.findByProjectId(project);
    assertEquals(1, created.size());
    assertEquals(devId, created.get(0).getAssigneeId());
    assertTrue(created.get(0).getAssignedDeveloperIds().isEmpty());
    assertEquals(
        1, mongo.count(Query.query(Criteria.where("projectId").is(project)), Memory.class));
    Provider p = mongo.findById(provider, Provider.class);
    assertEquals(150, p.getUsedTokens());
    assertEquals(49850, p.getRemainingTokens());
    assertTrue(p.getReservations().isEmpty());
    JsonNode next = assign(dev, "Move the target to Friday", id), job = claim();
    assertEquals(next.path("id").asText(), job.path("runId").asText());
    JsonNode context =
        worker(
                get("/internal/agents/" + job.path("runId").asText() + "/context"),
                job.path("token").asText(),
                null,
                200)
            .path("context");
    assertEquals("Prepare the release", context.path("originalAssignment").asText());
    assertEquals("Move the target to Friday", context.path("assignment").asText());
    assertEquals(1, context.path("approvedMemory").size());
    assertEquals("Release plan", context.path("previousOutput").path("summary").asText());
    tasks.deleteById(created.get(0).getId());
  }

  @Test
  void staleContextBlocksApprovalAndRevocationBlocksExecution() throws Exception {
    String id = ready("Create a plan").path("id").asText();
    Project p = projects.findById(project).orElseThrow();
    p.setDescription("Requirements changed");
    projects.save(p);
    request(post(path("/runs/" + id + "/review")), admin, Map.of("accept", true), 409);
    assertTrue(tasks.findByProjectId(project).isEmpty());
    assign(dev, "Try again", null);
    JsonNode job = claim();
    String run = job.path("runId").asText(), lease = job.path("token").asText();
    p.setDeveloperIds(List.of());
    projects.save(p);
    worker(get("/internal/agents/" + run + "/context"), lease, null, 403);
  }

  String claudeProvider() throws Exception {
    var body = new HashMap<>(providerBody());
    body.putAll(
        Map.of(
            "name", "Claude",
            "kind", "anthropic",
            "model", "claude-opus-5-5",
            "apiKey", "synthetic-claude-key",
            "remainingTokens", 100000,
            "inputPrice", 4,
            "outputPrice", 20));
    body.remove("baseUrl");
    return request(post("/api/agents/providers"), admin, body, 200).path("id").asText();
  }

  Map<String, Object> orchestratorBody(String brain, String workerProvider, String method) {
    var body = new HashMap<String, Object>();
    body.put("name", "Captain");
    body.put("specialty", "orchestrator");
    body.put("instructions", "Delegate to specialists and merge their proposals");
    body.put("providerId", brain);
    body.put("allowedRoles", List.of("Admin", "Developer"));
    body.put("enabled", true);
    body.put("maxInputTokens", 10000);
    body.put("maxOutputTokens", 2000);
    if (workerProvider != null) body.put("workerProviderId", workerProvider);
    body.put("maxWorkers", 2);
    body.put("contextMethod", method);
    return body;
  }

  Map<String, Object> trace(String method) {
    return Map.of(
        "method", method,
        "candidates", 12,
        "selected", 4,
        "promptBytes", 9000,
        "selectedIds", List.of("feedback-a", "t1"),
        "workers", List.of("backend", "testing"));
  }

  @Test
  void orchestratorReservesBothProvidersAndSettlesEachWithActualUsage() throws Exception {
    String brain = claudeProvider();
    agent =
        request(post(path("")), admin, orchestratorBody(brain, provider, "planned"), 200)
            .path("id")
            .asText();
    Feedback feedback = new Feedback();
    feedback.setProjectId(project);
    feedback.setMessage("Checkout payment times out after 30 seconds");
    feedback.setStatus("open");
    feedback.setDateIssued(LocalDate.now());
    mongo.insert(feedback);

    String id = assign(dev, "Fix checkout timeouts", null).path("id").asText();
    // Brain: plan + merge calls. Worker: one call per specialist (maxWorkers = 2).
    assertEquals(100000 - 24000, mongo.findById(brain, Provider.class).getRemainingTokens());
    assertEquals(50000 - 24000, mongo.findById(provider, Provider.class).getRemainingTokens());

    JsonNode job = claim();
    assertEquals("orchestrator", job.path("specialty").asText());
    String lease = job.path("token").asText();
    JsonNode context = worker(get("/internal/agents/" + id + "/context"), lease, null, 200);
    assertEquals("anthropic", context.path("provider").path("kind").asText());
    assertEquals("synthetic-claude-key", context.path("provider").path("apiKey").asText());
    assertEquals("ollama", context.path("workerProvider").path("kind").asText());
    assertEquals(2, context.path("maxWorkers").asInt());
    assertEquals("planned", context.path("contextMethod").asText());
    JsonNode evidence = context.path("context").path("evidence");
    assertEquals("feedback", evidence.get(0).path("kind").asText());
    assertTrue(evidence.get(0).path("text").asText().contains("times out"));
    worker(
        post("/internal/agents/" + id + "/begin"),
        lease,
        Map.of("contextHash", context.path("contextHash").asText()),
        200);

    // New activity is evidence, not part of the fingerprint: the run can still publish.
    Feedback later = new Feedback();
    later.setProjectId(project);
    later.setMessage("Also slow on mobile");
    later.setDateIssued(LocalDate.now());
    mongo.insert(later);

    var tooMuchWorker = new HashMap<String, Object>();
    tooMuchWorker.putAll(
        Map.of(
            "output", output(),
            "inputTokens", 30000,
            "outputTokens", 1000,
            "workerInputTokens", 25000,
            "workerOutputTokens", 600,
            "usageEstimated", false,
            "trace", trace("planned")));
    worker(post("/internal/agents/" + id + "/complete"), lease, tooMuchWorker, 400);
    var wrongMethod = new HashMap<>(tooMuchWorker);
    wrongMethod.putAll(
        Map.of(
            "inputTokens", 5000,
            "workerInputTokens", 3000,
            "trace", trace("engine")));
    worker(post("/internal/agents/" + id + "/complete"), lease, wrongMethod, 400);
    var valid = new HashMap<>(wrongMethod);
    valid.put("trace", trace("planned"));
    worker(post("/internal/agents/" + id + "/complete"), lease, valid, 200);

    Run ready = mongo.findById(id, Run.class);
    assertEquals("READY", ready.getStatus());
    assertEquals(List.of("backend", "testing"), ready.getContextTrace().workers());
    // Brain used (5000 + 1000) - (3000 + 600) = 2400 tokens: 2000 in at $4, 400 out at $20.
    assertEquals((2000 * 4 + 400 * 20) / 1_000_000d, ready.getEstimatedCost(), 1e-12);
    Provider brainAfter = mongo.findById(brain, Provider.class);
    Provider workerAfter = mongo.findById(provider, Provider.class);
    assertEquals(100000 - 2400, brainAfter.getRemainingTokens());
    assertEquals(50000 - 3600, workerAfter.getRemainingTokens());
    assertTrue(brainAfter.getReservations().isEmpty());
    assertTrue(workerAfter.getReservations().isEmpty());

    request(post(path("/runs/" + id + "/review")), admin, Map.of("accept", false), 200);
    JsonNode rows = request(get(path("/evaluation")), dev, null, 200);
    assertEquals(1, rows.size());
    assertEquals("planned", rows.get(0).path("method").asText());
    assertEquals(1, rows.get(0).path("rejected").asInt());
    assertEquals(0.0, rows.get(0).path("approvalRate").asDouble());
    mongo.remove(Query.query(Criteria.where("projectId").is(project)), Feedback.class);
  }

  @Test
  void orchestratorOnOneProviderHoldsOneReservationAndRefundsTheRest() throws Exception {
    agent =
        request(post(path("")), admin, orchestratorBody(provider, provider, "engine"), 200)
            .path("id")
            .asText();
    String id = assign(dev, "Plan the release", null).path("id").asText();
    // Two orchestrator calls plus two specialist calls, all on the same provider.
    Provider reserved = mongo.findById(provider, Provider.class);
    assertEquals(50000 - 48000, reserved.getRemainingTokens());
    assertEquals(Map.of(id, 48000), reserved.getReservations());
    JsonNode job = claim();
    String lease = job.path("token").asText();
    String hash =
        worker(get("/internal/agents/" + id + "/context"), lease, null, 200)
            .path("contextHash")
            .asText();
    worker(post("/internal/agents/" + id + "/begin"), lease, Map.of("contextHash", hash), 200);
    var body = new HashMap<String, Object>();
    body.putAll(
        Map.of(
            "output", output(),
            "inputTokens", 7000,
            "outputTokens", 1500,
            "workerInputTokens", 4000,
            "workerOutputTokens", 700,
            "usageEstimated", false,
            "trace", trace("engine")));
    worker(post("/internal/agents/" + id + "/complete"), lease, body, 200);
    Provider settled = mongo.findById(provider, Provider.class);
    assertEquals(50000 - 8500, settled.getRemainingTokens());
    assertEquals(8500, settled.getUsedTokens());
    assertTrue(settled.getReservations().isEmpty());
  }

  @Test
  void compatibleProvidersOnlyUseListedHttpsAddressesAndKeysNeverMoveHosts() throws Exception {
    var body = new HashMap<>(providerBody());
    body.putAll(
        Map.of(
            "name", "Groq",
            "kind", "compatible",
            "model", "openai/gpt-oss-20b",
            "baseUrl", "https://api.groq.com/openai/v1/",
            "apiKey", "synthetic-compatible-key"));
    JsonNode saved = request(post("/api/agents/providers"), admin, body, 200);
    assertEquals("https://api.groq.com/openai/v1", saved.path("baseUrl").asText());
    for (String address :
        List.of(
            "http://api.groq.com/openai/v1",
            "https://attacker.example/openai/v1",
            "https://api.groq.com:8443/openai/v1",
            "https://user@api.groq.com/openai/v1")) {
      var invalid = new HashMap<>(body);
      invalid.put("baseUrl", address);
      request(post("/api/agents/providers"), admin, invalid, 400);
    }
    // Moving a saved provider to another allowed host requires entering the key again.
    var moved = new HashMap<>(body);
    moved.put("baseUrl", "https://openrouter.ai/api/v1");
    moved.put("apiKey", "");
    moved.put("revision", saved.path("revision").asLong());
    String id = saved.path("id").asText();
    request(put("/api/agents/providers/" + id), admin, moved, 400);
    var unchanged = new HashMap<>(body);
    unchanged.put("apiKey", "");
    unchanged.put("revision", saved.path("revision").asLong());
    request(put("/api/agents/providers/" + id), admin, unchanged, 200);
  }

  @Test
  void orchestratorSettingsAndClaudeKeysAreValidated() throws Exception {
    var noKey = new HashMap<>(providerBody());
    noKey.put("kind", "anthropic");
    request(post("/api/agents/providers"), admin, noKey, 400);
    String brain = claudeProvider();
    request(post(path("")), admin, orchestratorBody(brain, null, "engine"), 400);
    var plannedSingle = orchestratorBody(brain, null, "planned");
    plannedSingle.put("specialty", "backend");
    plannedSingle.remove("maxWorkers");
    request(post(path("")), admin, plannedSingle, 400);
    var delegatingSingle = orchestratorBody(brain, provider, "engine");
    delegatingSingle.put("specialty", "testing");
    request(post(path("")), admin, delegatingSingle, 400);
    plannedSingle.put("contextMethod", "truncation");
    request(post(path("")), admin, plannedSingle, 200);
  }

  @Test
  void budgetAndLeasesPreventDuplicatePaidCallsAndRefundUnstartedWork() throws Exception {
    JsonNode run = assign(dev, "Plan", null);
    String id = run.path("id").asText();
    assertEquals(38000, mongo.findById(provider, Provider.class).getRemainingTokens());
    JsonNode job = claim();
    String lease = job.path("token").asText();
    worker(
        get("/internal/agents/" + id + "/context"),
        "wrong-token-at-least-32-characters",
        null,
        401);
    String hash =
        worker(get("/internal/agents/" + id + "/context"), lease, null, 200)
            .path("contextHash")
            .asText();
    worker(post("/internal/agents/" + id + "/begin"), lease, Map.of("contextHash", hash), 200);
    worker(post("/internal/agents/" + id + "/begin"), lease, Map.of("contextHash", hash), 409);
    worker(post("/internal/agents/" + id + "/failed"), lease, null, 200);
    Provider p = mongo.findById(provider, Provider.class);
    assertEquals(12000, p.getUsedTokens());
    assertEquals(38000, p.getRemainingTokens());
    String next = assign(dev, "Cancel this", null).path("id").asText();
    request(post(path("/runs/" + next + "/cancel")), dev, null, 200);
    p = mongo.findById(provider, Provider.class);
    assertEquals(38000, p.getRemainingTokens());
    var update = new Update().set("remainingTokens", 0);
    mongo.updateFirst(Query.query(Criteria.where("_id").is(provider)), update, Provider.class);
    request(post(path("/runs")), dev, Map.of("agentId", agent, "instruction", "Exhausted"), 400);
  }
}
