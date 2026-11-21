package com.HiCaptain.demo.agent;

import com.HiCaptain.demo.agent.AgentModels.*;
import com.HiCaptain.demo.model.Feedback;
import com.HiCaptain.demo.model.GitHubCommit;
import com.HiCaptain.demo.model.GitHubPullRequest;
import com.HiCaptain.demo.model.Meeting;
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
  private final Set<String> compatibleOrigins;

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
          String origins,
      // The worker sends the decrypted key to this address, so only listed HTTPS origins are allowed.
      @Value(
              "${AGENT_COMPATIBLE_ALLOWED_ORIGINS:https://generativelanguage.googleapis.com,https://api.groq.com,https://openrouter.ai}")
          String compatibleOrigins) {
    this.compatibleOrigins = Set.copyOf(Arrays.asList(compatibleOrigins.split(",")));
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
      @NotNull @Pattern(regexp = "openai|anthropic|compatible|ollama") String kind,
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
      @NotNull
          @Pattern(regexp = "planner|researcher|orchestrator|frontend|backend|testing|deployment")
          String specialty,
      @NotBlank @Size(max = 6000) String instructions,
      @NotBlank String providerId,
      @NotEmpty Set<@NotNull Role> allowedRoles,
      boolean enabled,
      @Min(8192) @Max(32000) int maxInputTokens,
      @Min(256) @Max(8000) int maxOutputTokens,
      String workerProviderId,
      @Min(1) @Max(4) Integer maxWorkers,
      @Pattern(regexp = "truncation|engine|planned") String contextMethod) {}

  static final String ORCHESTRATOR = "orchestrator";
  static final String DEFAULT_METHOD = "engine";
  static final int DEFAULT_WORKERS = 3;
  // An orchestrator calls its own model twice: once to plan, once to merge worker results.
  static final int ORCHESTRATOR_CALLS = 2;

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
    String url =
        in.kind().equals("anthropic") ? "https://api.anthropic.com" : "https://api.openai.com/v1";
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
    if (in.kind().equals("compatible")) {
      url = Objects.toString(in.baseUrl(), "").trim().replaceAll("/+$", "");
      try {
        URI uri = URI.create(url);
        if (!"https".equals(uri.getScheme())
            || uri.getHost() == null
            || uri.getPort() != -1
            || uri.getUserInfo() != null
            || uri.getQuery() != null
            || uri.getFragment() != null
            || !compatibleOrigins.contains("https://" + uri.getHost())) throw new IllegalArgumentException();
      } catch (IllegalArgumentException invalid) {
        throw bad("This provider address is not allowed by the deployment");
      }
    }
    if (!Double.isFinite(in.inputPrice()) || !Double.isFinite(in.outputPrice()))
      throw bad("Invalid token prices");
    // A saved key is kept only for the same kind and address; it is never sent to a new host.
    String encrypted =
        old == null || !old.getKind().equals(in.kind()) || !url.equals(old.getBaseUrl())
            ? null
            : old.getEncryptedKey();
    if (in.apiKey() != null && !in.apiKey().isBlank())
      encrypted = cipher.encrypt(in.apiKey().trim());
    if (!in.kind().equals("ollama") && encrypted == null) throw bad("An API key is required");
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
    boolean orchestrator = ORCHESTRATOR.equals(in.specialty());
    String worker = blank(in.workerProviderId()) ? null : in.workerProviderId();
    if (orchestrator && worker == null) throw bad("Choose a worker provider for the orchestrator");
    if (!orchestrator && (worker != null || in.maxWorkers() != null))
      throw bad("Only orchestrators delegate to workers");
    // Small models plan their own lookups poorly, so only an orchestrator may plan retrieval.
    if ("planned".equals(in.contextMethod()) && !orchestrator)
      throw bad("Planned retrieval requires an orchestrator");
    if (worker != null) provider(worker, org());
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
    a.setWorkerProviderId(worker);
    a.setMaxWorkers(orchestrator ? Objects.requireNonNullElse(in.maxWorkers(), DEFAULT_WORKERS) : null);
    a.setContextMethod(in.contextMethod());
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
    int perCall = a.getMaxInputTokens() + a.getMaxOutputTokens();
    boolean orchestrator = ORCHESTRATOR.equals(a.getSpecialty());
    Provider workerProvider = orchestrator ? provider(a.getWorkerProviderId(), org()) : null;
    if (workerProvider != null && !workerProvider.isEnabled())
      throw bad("Worker provider is disabled");
    int workerShare = orchestrator ? perCall * a.getMaxWorkers() : 0;
    // A shared provider holds one reservation; a separate worker provider holds its own.
    boolean separate = workerProvider != null && !workerProvider.getId().equals(p.getId());
    int reserved = (orchestrator ? perCall * ORCHESTRATOR_CALLS : perCall) + (separate ? 0 : workerShare);
    int workerReserved = separate ? workerShare : 0;
    reserve(p.getId(), id, reserved);
    if (separate) {
      try {
        reserve(workerProvider.getId(), id, workerReserved);
      } catch (RuntimeException exhausted) {
        release(p.getId(), id, reserved, 0);
        throw exhausted;
      }
    }
    Run r = new Run();
    r.setSpecialty(a.getSpecialty());
    r.setContextMethod(Objects.requireNonNullElse(a.getContextMethod(), DEFAULT_METHOD));
    r.setWorkerProviderId(separate ? workerProvider.getId() : null);
    r.setWorkerReservedTokens(workerReserved);
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
      settle(r, 0, 0);
      throw failure;
    }
  }

  public List<Run> runs(String project) {
    project(project);
    return mongo.find(
        scope(project).with(Sort.by(Sort.Direction.DESC, "createdAt")).limit(50), Run.class);
  }

  /**
   * Compares context methods on this project's reviewed proposals. Human approval is the
   * feedback signal that a fixed benchmark such as LongMemEval does not provide.
   */
  public List<Map<String, Object>> evaluation(String project) {
    project(project);
    // Group by method and workflow so an orchestrator is never compared with a single agent.
    Map<List<String>, List<Run>> groups = new TreeMap<>(Comparator.comparing(Object::toString));
    for (Run r :
        mongo.find(
            scope(project)
                .addCriteria(Criteria.where("contextTrace").ne(null))
                .with(Sort.by(Sort.Direction.DESC, "createdAt"))
                .limit(1000),
            Run.class))
      groups
          .computeIfAbsent(
              List.of(method(r), ORCHESTRATOR.equals(r.getSpecialty()) ? "orchestrator" : "single"),
              key -> new ArrayList<>())
          .add(r);
    List<Map<String, Object>> rows = new ArrayList<>();
    groups.forEach(
        (key, list) -> {
          long approved = list.stream().filter(r -> "APPROVED".equals(r.getStatus())).count();
          long rejected = list.stream().filter(r -> "REJECTED".equals(r.getStatus())).count();
          Map<String, Object> row = new LinkedHashMap<>();
          row.put("method", key.get(0));
          row.put("workflow", key.get(1));
          row.put("runs", list.size());
          row.put("approved", approved);
          row.put("rejected", rejected);
          row.put(
              "approvalRate",
              approved + rejected == 0 ? null : (double) approved / (approved + rejected));
          row.put("averageInputTokens", average(list, r -> r.getInputTokens()));
          row.put("averageOutputTokens", average(list, r -> r.getOutputTokens()));
          row.put("averagePromptBytes", average(list, r -> r.getContextTrace().promptBytes()));
          row.put("averageSelected", average(list, r -> r.getContextTrace().selected()));
          row.put("averageCost", list.stream().mapToDouble(Run::getEstimatedCost).average().orElse(0));
          rows.add(row);
        });
    return rows;
  }

  private static double average(List<Run> runs, java.util.function.ToIntFunction<Run> value) {
    return runs.stream().mapToInt(value).average().orElse(0);
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
    if (stopped != null) settle(stopped);
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
            Run.class)) settle(terminal);
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
      return Map.of(
          "runId", r.getId(),
          "token", token,
          "specialty", Objects.toString(r.getSpecialty(), ""));
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
    String hash = hash(snapshot);
    // Activity evidence is read for retrieval but kept out of the fingerprint: a new commit
    // should not invalidate a proposal that is waiting for review.
    Map<String, Object> context = new TreeMap<>(snapshot);
    context.put("evidence", evidence(r));
    context.put("memoryDates", memoryDates(r));
    Map<String, Object> result = new HashMap<>();
    result.put("context", context);
    result.put("contextHash", hash);
    result.put("maxInputTokens", a.getMaxInputTokens());
    result.put("maxOutputTokens", a.getMaxOutputTokens());
    result.put("specialty", a.getSpecialty());
    result.put("contextMethod", method(r));
    result.put("provider", credentials(p));
    if (ORCHESTRATOR.equals(a.getSpecialty())) {
      result.put("maxWorkers", a.getMaxWorkers());
      result.put("workerProvider", credentials(provider(a.getWorkerProviderId(), r.getOrganizationId())));
    }
    return result;
  }

  private Map<String, Object> credentials(Provider p) {
    return Map.of(
        "kind",
        p.getKind(),
        "model",
        p.getModel(),
        "baseUrl",
        p.getBaseUrl(),
        "apiKey",
        p.getEncryptedKey() == null ? "" : cipher.decrypt(p.getEncryptedKey()));
  }

  private static final int EVIDENCE_PER_SOURCE = 100;

  /** The project event log: commits, pull requests, meetings, feedback and earlier proposals. */
  private List<Map<String, Object>> evidence(Run r) {
    String project = r.getProjectId();
    Query byProject =
        Query.query(Criteria.where("projectId").is(project)).limit(EVIDENCE_PER_SOURCE);
    List<Map<String, Object>> events = new ArrayList<>();
    // Mirror direct read rights: repository activity needs a non-client role, as in
    // GitHubController; meetings and feedback need project access, already checked.
    var roles = organizations.membership(r.getOrganizationId(), r.getInitiatedBy()).getRoles();
    boolean repository =
        !Collections.disjoint(roles, Set.of(Role.Admin, Role.ProjectManager, Role.Developer));
    if (repository)
    for (GitHubCommit c :
        mongo.find(
            Query.of(byProject).with(Sort.by(Sort.Direction.DESC, "authorDate")),
            GitHubCommit.class))
      events.add(
          record(
              "commit-" + c.getId(),
              "commit",
              c.getAuthorDate(),
              Objects.toString(c.getMessage(), "")
                  + " (" + Objects.toString(c.getAuthorUsername(), "unknown") + ", "
                  + c.getTotalChanges() + " lines)",
              0.5,
              ""));
    if (repository)
    for (GitHubPullRequest pr :
        mongo.find(
            Query.of(byProject).with(Sort.by(Sort.Direction.DESC, "updatedAt")),
            GitHubPullRequest.class))
      events.add(
          record(
              "pr-" + pr.getId(),
              "pull_request",
              pr.getUpdatedAt() != null ? pr.getUpdatedAt() : pr.getCreatedAt(),
              "#" + pr.getNumber() + " " + Objects.toString(pr.getTitle(), "") + ": "
                  + Objects.toString(pr.getBody(), ""),
              pr.isMerged() ? 0.7 : 0.6,
              pr.isMerged() ? "merged" : Objects.toString(pr.getState(), "")));
    for (Meeting m :
        mongo.find(
            Query.of(byProject).with(Sort.by(Sort.Direction.DESC, "startTime")), Meeting.class))
      events.add(
          record(
              "meeting-" + m.getId(),
              "meeting",
              m.getStartTime(),
              Objects.toString(m.getTitle(), "") + ": " + Objects.toString(m.getAgenda(), "")
                  + " " + Objects.toString(m.getDescription(), ""),
              0.6,
              Objects.toString(m.getStatus(), "")));
    for (Feedback f :
        mongo.find(
            Query.of(byProject).with(Sort.by(Sort.Direction.DESC, "dateIssued")), Feedback.class))
      events.add(
          record(
              "feedback-" + f.getId(),
              "feedback",
              f.getDateIssued(),
              Objects.toString(f.getMessage(), ""),
              0.8,
              Objects.toString(f.getStatus(), "")));
    for (Run past :
        mongo.find(
            Query.query(
                    Criteria.where("organizationId")
                        .is(r.getOrganizationId())
                        .and("projectId")
                        .is(project)
                        .and("_id")
                        .ne(r.getId())
                        .and("status")
                        .in("APPROVED", "REJECTED"))
                .with(Sort.by(Sort.Direction.DESC, "createdAt"))
                .limit(EVIDENCE_PER_SOURCE),
            Run.class))
      events.add(
          record(
              "run-" + past.getId(),
              "proposal",
              past.getCreatedAt(),
              past.getInstruction() + " -> " + past.getOutput().summary(),
              0.5,
              past.getStatus().toLowerCase()));
    return events;
  }

  private Map<String, Object> record(
      String id, String kind, Object time, String text, double importance, String outcome) {
    return Map.of(
        "id", id,
        "kind", kind,
        "time", Objects.toString(time, ""),
        "text", clip(text),
        "importance", importance,
        "outcome", outcome);
  }

  private Map<String, String> memoryDates(Run r) {
    Map<String, String> dates = new TreeMap<>();
    for (Memory m :
        mongo.find(
            Query.query(
                    Criteria.where("organizationId")
                        .is(r.getOrganizationId())
                        .and("projectId")
                        .is(r.getProjectId()))
                .limit(200),
            Memory.class))
      if (m.getCreatedAt() != null) dates.put(m.getId(), m.getCreatedAt().toString());
    return dates;
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

  /** Usage reported by the worker. Worker tokens are a subset of the totals. */
  public record Usage(
      int inputTokens, int outputTokens, int workerInputTokens, int workerOutputTokens) {}

  public void complete(
      String id, String token, Output output, Usage usage, boolean estimated, ContextTrace trace) {
    Run r = leased(id, token);
    authorize(r);
    int input = usage.inputTokens(), out = usage.outputTokens();
    int workerIn = usage.workerInputTokens(), workerOut = usage.workerOutputTokens();
    long worker = (long) workerIn + workerOut, total = (long) input + out;
    boolean separate = !blank(r.getWorkerProviderId());
    if (!r.isCallStarted()
        || Math.min(Math.min(input, out), Math.min(workerIn, workerOut)) < 0
        || workerIn > input
        || workerOut > out
        || total > (long) r.getReservedTokens() + r.getWorkerReservedTokens()
        || (separate
            && (worker > r.getWorkerReservedTokens() || total - worker > r.getReservedTokens()))
        || (!ORCHESTRATOR.equals(r.getSpecialty()) && worker > 0)
        || (trace != null && !trace.method().equals(method(r))))
      throw bad("Invalid model usage");
    if (!Objects.equals(r.getContextHash(), hash(snapshot(r)))) {
      fail(r);
      return;
    }
    Provider p = provider(r.getProviderId(), r.getOrganizationId());
    Provider w = separate ? provider(r.getWorkerProviderId(), r.getOrganizationId()) : p;
    double cost =
        ((input - workerIn) * p.getInputPrice()
                + (out - workerOut) * p.getOutputPrice()
                + workerIn * w.getInputPrice()
                + workerOut * w.getOutputPrice())
            / 1_000_000d;
    Run ready =
        mongo.findAndModify(
            lease(id, token),
            event(
                new Update()
                    .set("status", "READY")
                    .set("output", output)
                    .set("inputTokens", input)
                    .set("outputTokens", out)
                    .set("workerInputTokens", workerIn)
                    .set("workerOutputTokens", workerOut)
                    .set("contextTrace", trace)
                    .set("usageEstimated", estimated)
                    .set("estimatedCost", cost)
                    .set("costAvailable", priced(p) && priced(w)),
                "worker",
                "Output ready for human review"),
            FindAndModifyOptions.options().returnNew(true),
            Run.class);
    if (ready != null) settle(ready);
  }

  private static boolean priced(Provider p) {
    return p.getKind().equals("ollama") || p.getInputPrice() > 0 || p.getOutputPrice() > 0;
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
    settle(r);
  }

  /** Settle with confirmed usage, the full reservation after an uncertain call, or nothing. */
  private void settle(Run r) {
    boolean separate = !blank(r.getWorkerProviderId());
    if (r.getOutput() != null) {
      int worker = separate ? r.getWorkerInputTokens() + r.getWorkerOutputTokens() : 0;
      settle(r, r.getInputTokens() + r.getOutputTokens() - worker, worker);
    } else if (r.isCallStarted()) settle(r, r.getReservedTokens(), r.getWorkerReservedTokens());
    else settle(r, 0, 0);
  }

  private void settle(Run r, int used, int workerUsed) {
    release(r.getProviderId(), r.getId(), r.getReservedTokens(), used);
    if (!blank(r.getWorkerProviderId()))
      release(r.getWorkerProviderId(), r.getId(), r.getWorkerReservedTokens(), workerUsed);
    used += workerUsed;
    Update update = new Update().set("settled", true).set("accountedTokens", used);
    if (r.getOutput() == null && used > 0) update.set("usageEstimated", true);
    mongo.updateFirst(
        Query.query(Criteria.where("_id").is(r.getId()).and("settled").ne(true)),
        update,
        Run.class);
  }

  private void reserve(String providerId, String runId, int tokens) {
    if (mongo.findAndModify(
            Query.query(
                Criteria.where("_id")
                    .is(providerId)
                    .and("enabled")
                    .is(true)
                    .and("remainingTokens")
                    .gte(tokens)),
            new Update()
                .inc("remainingTokens", -tokens)
                .inc("revision", 1L)
                .set("reservations." + runId, tokens),
            Provider.class)
        == null) throw bad("Provider token allowance is exhausted");
  }

  /** Return the unused part of one provider's reservation; idempotent per run. */
  private void release(String providerId, String runId, int reserved, int used) {
    mongo.updateFirst(
        Query.query(
            Criteria.where("_id").is(providerId).and("reservations." + runId).is(reserved)),
        new Update()
            .unset("reservations." + runId)
            .inc("remainingTokens", Math.max(0, reserved - used))
            .inc("usedTokens", used)
            .inc("revision", 1L),
        Provider.class);
  }

  /** Runs queued before context methods existed use the default engine. */
  private static String method(Run r) {
    return Objects.requireNonNullElse(r.getContextMethod(), DEFAULT_METHOD);
  }

  private static boolean blank(String value) {
    return value == null || value.isBlank();
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
    List<Object> parts = new ArrayList<>(base(a, p));
    // New settings join the fingerprint only when used, so existing runs stay valid.
    if (a.getContextMethod() != null) parts.add(a.getContextMethod());
    if (ORCHESTRATOR.equals(a.getSpecialty())) {
      Provider w = provider(a.getWorkerProviderId(), a.getOrganizationId());
      parts.addAll(
          List.of(
              a.getMaxWorkers(),
              w.getId(),
              w.getKind(),
              w.getModel(),
              w.getBaseUrl(),
              w.isEnabled(),
              Objects.toString(w.getEncryptedKey(), ""),
              w.getInputPrice(),
              w.getOutputPrice()));
    }
    return hash(parts);
  }

  private List<Object> base(Agent a, Provider p) {
    return (
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
