package com.HiCaptain.demo.agent;

import com.HiCaptain.demo.agent.AgentModels.*;
import com.HiCaptain.demo.model.Project;
import com.HiCaptain.demo.model.Task;
import com.HiCaptain.demo.repository.*;
import com.HiCaptain.demo.service.*;
import com.HiCaptain.demo.util.Role;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import jakarta.validation.constraints.*;
import java.net.URI;
import java.security.MessageDigest;
import java.time.*;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.*;
import org.springframework.data.mongodb.core.query.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AgentService {
  private final MongoTemplate mongo;
  private final OrganizationService organizations;
  private final ProjectService projects;
  private final ProjectRepository projectRepo;
  private final UserRepository users;
  private final TaskRepository tasks;
  private final ProviderTokenCipher cipher;
  private final ObjectMapper json;
  private final Set<String> origins;

  public AgentService(
      MongoTemplate mongo,
      OrganizationService organizations,
      ProjectService projects,
      ProjectRepository projectRepo,
      UserRepository users,
      TaskRepository tasks,
      ProviderTokenCipher cipher,
      ObjectMapper json,
      @Value(
              "${AGENT_OLLAMA_ALLOWED_ORIGINS:http://localhost:11434,http://ollama:11434,http://host.docker.internal:11434}")
          String origins) {
    this.mongo = mongo;
    this.organizations = organizations;
    this.projects = projects;
    this.projectRepo = projectRepo;
    this.users = users;
    this.tasks = tasks;
    this.cipher = cipher;
    this.json = json;
    this.origins = Set.copyOf(Arrays.asList(origins.split(",")));
  }

  public record ProviderInput(
      @NotBlank @Size(max = 80) String name,
      @NotNull @Pattern(regexp = "openai|ollama") String kind,
      @NotBlank @Size(max = 120) String model,
      @Size(max = 500) String baseUrl,
      @Size(max = 500) String apiKey,
      boolean enabled,
      @Min(0) @Max(1000000000) long remainingTokens,
      @DecimalMin("0") @DecimalMax("10000") double inputPrice,
      @DecimalMin("0") @DecimalMax("10000") double outputPrice,
      Long revision) {}

  public record AgentInput(
      @NotBlank @Size(max = 80) String name,
      @NotNull @Pattern(regexp = "planner|researcher") String specialty,
      @NotBlank @Size(max = 6000) String instructions,
      @NotBlank String providerId,
      @NotEmpty Set<@NotNull Role> allowedRoles,
      boolean enabled,
      @Min(8192) @Max(32000) int maxInputTokens,
      @Min(256) @Max(8000) int maxOutputTokens) {}

  public record Assignment(
      @NotBlank String agentId,
      @NotBlank @Size(max = 10000) String instruction,
      String taskId,
      String parentId) {}

  public List<Provider> providers() {
    admin();
    return mongo.find(Query.query(Criteria.where("organizationId").is(org())), Provider.class);
  }

  public Provider saveProvider(String id, ProviderInput in) {
    admin();
    Provider old = id == null ? null : provider(id, org());
    String url = "https://api.openai.com/v1";
    if (in.kind().equals("ollama")) {
      url = Objects.toString(in.baseUrl(), "").replaceAll("/+$", "");
      try {
        URI uri = URI.create(url);
        if (!Set.of("http", "https").contains(uri.getScheme())
            || !origins.contains(url)
            || uri.getHost() == null
            || uri.getUserInfo() != null
            || uri.getQuery() != null
            || uri.getFragment() != null
            || !uri.getPath().isEmpty()) throw new IllegalArgumentException();
      } catch (IllegalArgumentException invalid) {
        throw bad("Ollama origin is not allowed by the deployment");
      }
    }
    if (!Double.isFinite(in.inputPrice()) || !Double.isFinite(in.outputPrice()))
      throw bad("Invalid token prices");
    String encrypted =
        old == null || !old.getKind().equals(in.kind()) ? null : old.getEncryptedKey();
    if (in.apiKey() != null && !in.apiKey().isBlank())
      encrypted = cipher.encrypt(in.apiKey().trim());
    if (in.kind().equals("openai") && encrypted == null) throw bad("An API key is required");
    String key = id == null ? UUID.randomUUID().toString() : id;
    Update update =
        new Update()
            .set("organizationId", org())
            .set("name", in.name().trim())
            .set("kind", in.kind())
            .set("model", in.model().trim())
            .set("baseUrl", url)
            .set("encryptedKey", encrypted)
            .set("enabled", in.enabled())
            .set("remainingTokens", in.remainingTokens())
            .set("inputPrice", in.inputPrice())
            .set("outputPrice", in.outputPrice());
    Query q = Query.query(Criteria.where("_id").is(key).and("organizationId").is(org()));
    if (old == null)
      mongo.upsert(q, update.set("revision", 0L).set("usedTokens", 0L), Provider.class);
    else if (in.revision() == null
        || mongo.findAndModify(
                q.addCriteria(Criteria.where("revision").is(in.revision())),
                update.inc("revision", 1L),
                Provider.class)
            == null) throw conflict("Provider usage changed. Reload settings before saving.");
    return provider(key, org());
  }

  public List<Map<String, Object>> choices(String project) {
    project(project);
    return mongo
        .find(
            Query.query(Criteria.where("organizationId").is(org()).and("enabled").is(true)),
            Provider.class)
        .stream()
        .map(
            p ->
                Map.<String, Object>of(
                    "id",
                    p.getId(),
                    "name",
                    p.getName(),
                    "kind",
                    p.getKind(),
                    "model",
                    p.getModel()))
        .toList();
  }

  public List<Agent> agents(String project) {
    project(project);
    return mongo.find(scope(project), Agent.class);
  }

  public Agent saveAgent(String project, String id, AgentInput in) {
    manager(project(project));
    provider(in.providerId(), org());
    if (in.allowedRoles().contains(Role.Client)) throw bad("Clients cannot execute agents");
    Agent a = id == null ? new Agent() : agent(id, project, org());
    a.setOrganizationId(org());
    a.setProjectId(project);
    a.setName(in.name().trim());
    a.setSpecialty(in.specialty());
    a.setInstructions(in.instructions().trim());
    a.setProviderId(in.providerId());
    a.setAllowedRoles(Set.copyOf(in.allowedRoles()));
    a.setEnabled(in.enabled());
    a.setMaxInputTokens(in.maxInputTokens());
    a.setMaxOutputTokens(in.maxOutputTokens());
    return mongo.save(a);
  }

  public Run assign(String project, Assignment in) {
    project(project);
    Agent a = agent(in.agentId(), project, org());
    allowed(a, organizations.membership(org(), user()).getRoles());
    Provider p = provider(a.getProviderId(), org());
    if (!a.isEnabled() || !p.isEnabled()) throw bad("Agent or provider is disabled");
    if (in.taskId() != null && !in.taskId().isBlank())
      tasks
          .findById(in.taskId())
          .filter(t -> project.equals(t.getProjectId()))
          .orElseThrow(() -> missing("Task"));
    String original = in.instruction();
    if (in.parentId() != null && !in.parentId().isBlank()) {
      Run parent = run(in.parentId(), project);
      if (parent.getOutput() == null
          || !Set.of("READY", "APPROVED", "REJECTED").contains(parent.getStatus()))
        throw bad("Previous output is not ready");
      original = Objects.toString(parent.getOriginalInstruction(), parent.getInstruction());
    }
    String id = UUID.randomUUID().toString();
    int reserved = a.getMaxInputTokens() + a.getMaxOutputTokens();
    if (mongo.findAndModify(
            Query.query(
                Criteria.where("_id")
                    .is(p.getId())
                    .and("enabled")
                    .is(true)
                    .and("remainingTokens")
                    .gte(reserved)),
            new Update()
                .inc("remainingTokens", -reserved)
                .inc("revision", 1L)
                .set("reservations." + id, reserved),
            Provider.class)
        == null) throw bad("Provider token allowance is exhausted");
    Run r = new Run();
    r.setId(id);
    r.setOrganizationId(org());
    r.setProjectId(project);
    r.setAgentId(a.getId());
    r.setAgentName(a.getName());
    r.setProviderId(p.getId());
    r.setInitiatedBy(user());
    r.setOwnerName(users.findById(user()).map(u -> u.getName()).orElse("Teammate"));
    r.setInstruction(in.instruction().trim());
    r.setOriginalInstruction(original);
    r.setTaskId(in.taskId());
    r.setParentId(in.parentId());
    r.setStatus("QUEUED");
    r.setReservedTokens(reserved);
    r.setCreatedAt(Instant.now());
    r.setConfigHash(config(a, p));
    r.setEvents(List.of(new Event(Instant.now(), user(), "Assignment queued")));
    try {
      return mongo.insert(r);
    } catch (RuntimeException failure) {
      settle(r, 0);
      throw failure;
    }
  }

  public List<Run> runs(String project) {
    project(project);
    return mongo.find(
        scope(project).with(Sort.by(Sort.Direction.DESC, "createdAt")).limit(50), Run.class);
  }

  public List<Memory> memory(String project) {
    project(project);
    return mongo.find(scope(project).with(Sort.by("_id")), Memory.class);
  }

  public Memory remember(String project, String content) {
    manager(project(project));
    if (mongo.count(scope(project), Memory.class) >= 200)
      throw bad("Memory is full; remove outdated entries first");
    Memory m = new Memory();
    m.setOrganizationId(org());
    m.setProjectId(project);
    m.setContent(content.trim());
    m.setApprovedBy(user());
    m.setCreatedAt(Instant.now());
    return mongo.insert(m);
  }

  public void forget(String project, String id) {
    manager(project(project));
    mongo.remove(scope(project).addCriteria(Criteria.where("_id").is(id)), Memory.class);
  }

  public Run cancel(String project, String id) {
    Project p = project(project);
    Run r = run(id, project);
    if (!r.getInitiatedBy().equals(user())) manager(p);
    Run stopped =
        mongo.findAndModify(
            Query.query(Criteria.where("_id").is(id).and("status").in("QUEUED", "RUNNING")),
            event(new Update().set("status", "CANCELLED"), user(), "Run stopped"),
            FindAndModifyOptions.options().returnNew(true),
            Run.class);
    if (stopped != null) settle(stopped, stopped.isCallStarted() ? stopped.getReservedTokens() : 0);
    return run(id, project);
  }

  public Run review(String project, String id, boolean accept) {
    manager(project(project));
    Run r = run(id, project);
    if (Set.of("APPROVED", "REJECTED").contains(r.getStatus())) return r;
    if (!Set.of("READY", "APPLYING").contains(r.getStatus())) throw bad("Output is not ready");
    if (!accept) {
      if (!r.getStatus().equals("READY")) throw bad("Approval is already applying");
      mongo.updateFirst(
          Query.query(Criteria.where("_id").is(id).and("status").is("READY")),
          event(
              new Update().set("status", "REJECTED").set("reviewedBy", user()),
              user(),
              "Proposal rejected"),
          Run.class);
      return run(id, project);
    }
    authorize(r);
    if (r.getStatus().equals("READY")) {
      if (!Objects.equals(r.getContextHash(), hash(snapshot(r))))
        throw conflict("Project context changed; request a new proposal");
      if (mongo.count(scope(project), Memory.class) + r.getOutput().decisions().size() > 200)
        throw bad("Memory is full");
      r =
          mongo.findAndModify(
              Query.query(Criteria.where("_id").is(id).and("status").is("READY")),
              event(
                  new Update().set("status", "APPLYING").set("reviewedBy", user()),
                  user(),
                  "Proposal approved"),
              FindAndModifyOptions.options().returnNew(true),
              Run.class);
      if (r == null) throw conflict("Another reviewer is applying this proposal");
    }
    List<String> created = new ArrayList<>();
    for (int i = 0; i < r.getOutput().tasks().size(); i++) {
      authorize(r);
      Proposal proposal = r.getOutput().tasks().get(i);
      Task t = new Task();
      t.setId("agent-" + id + "-" + i);
      t.setProjectId(project);
      t.setTitle(proposal.title());
      t.setDescription(
          proposal.description() + "\n\nAcceptance criteria:\n" + proposal.acceptanceCriteria());
      t.setStatus("pending");
      t.setPriority(proposal.priority());
      t.setDeadline(LocalDate.now().plusDays(7));
      t.setAssigneeId(r.getInitiatedBy());
      t.setAssignedDeveloperIds(List.of());
      t.setCreatedBy(r.getReviewedBy());
      t.setCreatedAt(LocalDateTime.now());
      t.setUpdatedAt(t.getCreatedAt());
      try {
        tasks.insert(t);
      } catch (DuplicateKeyException applied) {
      }
      created.add(t.getId());
    }
    for (int i = 0; i < r.getOutput().decisions().size(); i++) {
      authorize(r);
      Memory m = new Memory();
      m.setId("agent-" + id + "-" + i);
      m.setOrganizationId(org());
      m.setProjectId(project);
      m.setContent(r.getOutput().decisions().get(i));
      m.setSourceRunId(id);
      m.setApprovedBy(r.getReviewedBy());
      m.setCreatedAt(Instant.now());
      try {
        mongo.insert(m);
      } catch (DuplicateKeyException applied) {
      }
    }
    mongo.updateFirst(
        Query.query(Criteria.where("_id").is(id).and("status").is("APPLYING")),
        event(
            new Update().set("status", "APPROVED").set("createdTaskIds", created),
            user(),
            "Tasks and approved decisions saved"),
        Run.class);
    return run(id, project);
  }

  public Map<String, Object> claim() {
    for (Run terminal :
        mongo.find(
            Query.query(
                    Criteria.where("status")
                        .in("READY", "APPROVED", "REJECTED", "FAILED", "CANCELLED")
                        .and("settled")
                        .ne(true))
                .limit(20),
            Run.class))
      settle(
          terminal,
          terminal.getOutput() != null
              ? terminal.getInputTokens() + terminal.getOutputTokens()
              : terminal.isCallStarted() ? terminal.getReservedTokens() : 0);
    String token = UUID.randomUUID() + "-" + UUID.randomUUID();
    Run r =
        mongo.findAndModify(
            Query.query(
                    new Criteria()
                        .orOperator(
                            Criteria.where("status").is("QUEUED"),
                            Criteria.where("status")
                                .is("RUNNING")
                                .and("leaseUntil")
                                .lt(Instant.now())))
                .with(Sort.by("createdAt")),
            event(
                new Update()
                    .set("status", "RUNNING")
                    .set("leaseHash", hash(token))
                    .set("leaseUntil", Instant.now().plusSeconds(180))
                    .inc("attempts", 1),
                "worker",
                "Worker claimed assignment"),
            FindAndModifyOptions.options().returnNew(true),
            Run.class);
    if (r == null) return Map.of();
    try {
      authorize(r);
      if (r.getAttempts() > 3) throw bad("Recovery limit reached");
      return Map.of("runId", r.getId(), "token", token);
    } catch (RuntimeException invalid) {
      fail(r);
      return Map.of();
    }
  }

  public Map<String, Object> context(String id, String token) {
    Run r = leased(id, token);
    authorize(r);
    Agent a = agent(r.getAgentId(), r.getProjectId(), r.getOrganizationId());
    Provider p = provider(r.getProviderId(), r.getOrganizationId());
    Map<String, Object> snapshot = snapshot(r);
    return Map.of(
        "context",
        snapshot,
        "contextHash",
        hash(snapshot),
        "maxInputTokens",
        a.getMaxInputTokens(),
        "maxOutputTokens",
        a.getMaxOutputTokens(),
        "provider",
        Map.of(
            "kind",
            p.getKind(),
            "model",
            p.getModel(),
            "baseUrl",
            p.getBaseUrl(),
            "apiKey",
            p.getEncryptedKey() == null ? "" : cipher.decrypt(p.getEncryptedKey())));
  }

  public void begin(String id, String token, String contextHash) {
    Run r = leased(id, token);
    authorize(r);
    if (!Objects.equals(contextHash, hash(snapshot(r)))) throw conflict("Project context changed");
    if (mongo.findAndModify(
            lease(id, token).addCriteria(Criteria.where("callStarted").ne(true)),
            event(
                new Update().set("callStarted", true).set("contextHash", contextHash),
                "worker",
                "Model request started"),
            Run.class)
        == null) throw conflict("A model request already started; automatic retry is disabled");
  }

  public void heartbeat(String id, String token) {
    Run r = leased(id, token);
    authorize(r);
    mongo.updateFirst(
        lease(id, token),
        new Update().set("leaseUntil", Instant.now().plusSeconds(180)),
        Run.class);
  }

  public void complete(
      String id, String token, Output output, int input, int out, boolean estimated) {
    Run r = leased(id, token);
    authorize(r);
    if (!r.isCallStarted() || input < 0 || out < 0 || (long) input + out > r.getReservedTokens())
      throw bad("Invalid model usage");
    if (!Objects.equals(r.getContextHash(), hash(snapshot(r)))) {
      fail(r);
      return;
    }
    Provider p = provider(r.getProviderId(), r.getOrganizationId());
    Run ready =
        mongo.findAndModify(
            lease(id, token),
            event(
                new Update()
                    .set("status", "READY")
                    .set("output", output)
                    .set("inputTokens", input)
                    .set("outputTokens", out)
                    .set("usageEstimated", estimated)
                    .set(
                        "estimatedCost",
                        (input * p.getInputPrice() + out * p.getOutputPrice()) / 1_000_000d)
                    .set(
                        "costAvailable",
                        p.getKind().equals("ollama")
                            || p.getInputPrice() > 0
                            || p.getOutputPrice() > 0),
                "worker",
                "Output ready for human review"),
            FindAndModifyOptions.options().returnNew(true),
            Run.class);
    if (ready != null) settle(ready, input + out);
  }

  public void failed(String id, String token) {
    fail(leased(id, token));
  }

  private void fail(Run r) {
    mongo.updateFirst(
        Query.query(Criteria.where("_id").is(r.getId()).and("status").in("RUNNING", "QUEUED")),
        event(
            new Update()
                .set("status", "FAILED")
                .set(
                    "error",
                    "Execution stopped. Check model credentials, structured-output support, context"
                        + " limits, and project access. Start a fresh run when ready."),
            "worker",
            "Execution failed; uncertain requests are not repeated"),
        Run.class);
    settle(r, r.isCallStarted() ? r.getReservedTokens() : 0);
  }

  private void settle(Run r, int used) {
    mongo.updateFirst(
        Query.query(
            Criteria.where("_id")
                .is(r.getProviderId())
                .and("reservations." + r.getId())
                .is(r.getReservedTokens())),
        new Update()
            .unset("reservations." + r.getId())
            .inc("remainingTokens", Math.max(0, r.getReservedTokens() - used))
            .inc("usedTokens", used)
            .inc("revision", 1L),
        Provider.class);
    Update update = new Update().set("settled", true).set("accountedTokens", used);
    if (r.getOutput() == null && used > 0) update.set("usageEstimated", true);
    mongo.updateFirst(
        Query.query(Criteria.where("_id").is(r.getId()).and("settled").ne(true)),
        update,
        Run.class);
  }

  private Map<String, Object> snapshot(Run r) {
    Project p = projectRepo.findById(r.getProjectId()).orElseThrow(() -> missing("Project"));
    Agent a = agent(r.getAgentId(), r.getProjectId(), r.getOrganizationId());
    Map<String, Object> c = new TreeMap<>();
    c.put(
        "project",
        Map.of(
            "id",
            p.getId(),
            "name",
            p.getName(),
            "description",
            clip(p.getDescription()),
            "startDate",
            Objects.toString(p.getStartDate(), ""),
            "endDate",
            Objects.toString(p.getEndDate(), "")));
    c.put(
        "agent",
        Map.of(
            "name",
            a.getName(),
            "specialty",
            a.getSpecialty(),
            "instructions",
            a.getInstructions()));
    c.put("assignment", r.getInstruction());
    c.put("originalAssignment", r.getOriginalInstruction());
    c.put("selectedTaskId", Objects.toString(r.getTaskId(), ""));
    List<Task> selected =
        tasks.findByProjectId(r.getProjectId()).stream()
            .sorted(Comparator.comparing(Task::getId))
            .limit(200)
            .collect(java.util.stream.Collectors.toCollection(ArrayList::new));
    if (r.getTaskId() != null
        && !r.getTaskId().isBlank()
        && selected.stream().noneMatch(t -> r.getTaskId().equals(t.getId())))
      tasks
          .findById(r.getTaskId())
          .filter(t -> r.getProjectId().equals(t.getProjectId()))
          .ifPresent(selected::add);
    c.put(
        "tasks",
        selected.stream()
            .map(
                t ->
                    Map.of(
                        "id",
                        t.getId(),
                        "title",
                        t.getTitle(),
                        "description",
                        clip(t.getDescription()),
                        "status",
                        Objects.toString(t.getStatus(), ""),
                        "priority",
                        Objects.toString(t.getPriority(), ""),
                        "deadline",
                        Objects.toString(t.getDeadline(), ""),
                        "assignedDeveloperIds",
                        t.getAssignedDeveloperIds() == null
                            ? List.of()
                            : t.getAssignedDeveloperIds()))
            .toList());
    c.put(
        "approvedMemory",
        mongo
            .find(
                Query.query(
                        Criteria.where("organizationId")
                            .is(r.getOrganizationId())
                            .and("projectId")
                            .is(r.getProjectId()))
                    .with(Sort.by("_id"))
                    .limit(200),
                Memory.class)
            .stream()
            .map(
                m ->
                    Map.of(
                        "id",
                        m.getId(),
                        "content",
                        m.getContent(),
                        "approvedBy",
                        m.getApprovedBy()))
            .toList());
    if (r.getParentId() != null && !r.getParentId().isBlank()) {
      Run parent = mongo.findById(r.getParentId(), Run.class);
      if (parent != null
          && r.getProjectId().equals(parent.getProjectId())
          && r.getOrganizationId().equals(parent.getOrganizationId())) {
        c.put("previousOutput", parent.getOutput());
        c.put("previousAssignment", parent.getInstruction());
      }
    }
    return c;
  }

  private void authorize(Run r) {
    if (r.getTaskId() != null && !r.getTaskId().isBlank())
      tasks
          .findById(r.getTaskId())
          .filter(t -> r.getProjectId().equals(t.getProjectId()))
          .orElseThrow(() -> missing("Selected task"));
    if (!users.existsById(r.getInitiatedBy())) throw denied();
    var roles = organizations.membership(r.getOrganizationId(), r.getInitiatedBy()).getRoles();
    Project p = projectRepo.findById(r.getProjectId()).orElseThrow(() -> missing("Project"));
    if (!projects.canAccess(p, r.getOrganizationId(), r.getInitiatedBy(), roles)) throw denied();
    Agent a = agent(r.getAgentId(), r.getProjectId(), r.getOrganizationId());
    Provider provider = provider(r.getProviderId(), r.getOrganizationId());
    allowed(a, roles);
    if (!a.isEnabled()
        || !provider.isEnabled()
        || !Objects.equals(r.getConfigHash(), config(a, provider)))
      throw conflict("Agent configuration changed");
  }

  private String config(Agent a, Provider p) {
    return hash(
        List.of(
            a.getName(),
            a.getInstructions(),
            a.getSpecialty(),
            a.getProviderId(),
            a.getMaxInputTokens(),
            a.getMaxOutputTokens(),
            a.getAllowedRoles().stream().map(Enum::name).sorted().toList(),
            p.getKind(),
            p.getModel(),
            p.getBaseUrl(),
            Objects.toString(p.getEncryptedKey(), ""),
            p.getInputPrice(),
            p.getOutputPrice()));
  }

  private void allowed(Agent a, Set<Role> roles) {
    if (Collections.disjoint(a.getAllowedRoles(), roles)) throw denied();
  }

  private Run leased(String id, String token) {
    Run r = mongo.findOne(lease(id, token), Run.class);
    if (r == null)
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Run lease expired or revoked");
    return r;
  }

  private Query lease(String id, String token) {
    if (token == null || token.length() < 32) throw denied();
    return Query.query(
        Criteria.where("_id")
            .is(id)
            .and("leaseHash")
            .is(hash(token))
            .and("status")
            .is("RUNNING")
            .and("leaseUntil")
            .gt(Instant.now()));
  }

  private Provider provider(String id, String org) {
    Provider p =
        mongo.findOne(
            Query.query(Criteria.where("_id").is(id).and("organizationId").is(org)),
            Provider.class);
    if (p == null) throw missing("Provider");
    return p;
  }

  private Agent agent(String id, String project, String org) {
    Agent a =
        mongo.findOne(
            Query.query(
                Criteria.where("_id")
                    .is(id)
                    .and("projectId")
                    .is(project)
                    .and("organizationId")
                    .is(org)),
            Agent.class);
    if (a == null) throw missing("Agent");
    return a;
  }

  private Run run(String id, String project) {
    Run r = mongo.findOne(scope(project).addCriteria(Criteria.where("_id").is(id)), Run.class);
    if (r == null) throw missing("Run");
    return r;
  }

  private Project project(String id) {
    return projects.getById(id).orElseThrow(() -> missing("Project"));
  }

  private String org() {
    return organizations.currentOrgId();
  }

  private String user() {
    return organizations.currentUserId();
  }

  private Query scope(String project) {
    return Query.query(Criteria.where("organizationId").is(org()).and("projectId").is(project));
  }

  private void admin() {
    if (!organizations.membership(org(), user()).getRoles().contains(Role.Admin)) throw denied();
  }

  private void manager(Project p) {
    var roles = organizations.membership(org(), user()).getRoles();
    if (!roles.contains(Role.Admin)
        && !(roles.contains(Role.ProjectManager) && user().equals(p.getProjectManagerId())))
      throw denied();
  }

  private Update event(Update update, String actor, String message) {
    return update.push("events", new Event(Instant.now(), actor, message));
  }

  private String hash(Object value) {
    try {
      return HexFormat.of()
          .formatHex(
              MessageDigest.getInstance("SHA-256")
                  .digest(
                      json.writer()
                          .with(SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS)
                          .writeValueAsBytes(value)));
    } catch (Exception e) {
      throw new IllegalStateException(e);
    }
  }

  private String clip(String text) {
    String value = Objects.toString(text, "");
    return value.substring(0, Math.min(value.length(), 3000));
  }

  private ResponseStatusException missing(String name) {
    return new ResponseStatusException(HttpStatus.NOT_FOUND, name + " not found");
  }

  private ResponseStatusException bad(String message) {
    return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
  }

  private ResponseStatusException conflict(String message) {
    return new ResponseStatusException(HttpStatus.CONFLICT, message);
  }

  private ResponseStatusException denied() {
    return new ResponseStatusException(HttpStatus.FORBIDDEN, "Agent access denied");
  }
}
