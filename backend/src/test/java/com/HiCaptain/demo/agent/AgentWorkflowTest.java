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
