package com.HiCaptain.demo.agent;

import com.HiCaptain.demo.util.Role;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.*;
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;

public final class AgentModels {
  private AgentModels() {}

  @Data
  @Document("agent_providers")
  @CompoundIndex(name = "provider_org", def = "{'organizationId':1}")
  public static class Provider {
    @Id private String id;
    private String organizationId, name, kind, model, baseUrl;
    @JsonIgnore private String encryptedKey;
    private boolean enabled = true;
    private long remainingTokens, usedTokens, revision;
    private double inputPrice, outputPrice;
    @JsonIgnore private Map<String, Integer> reservations;
  }

  @Data
  @Document("project_agents")
  @CompoundIndex(name = "agent_project", def = "{'organizationId':1,'projectId':1}")
  public static class Agent {
    @Id private String id;
    private String organizationId, projectId, name, instructions, specialty, providerId;
    private Set<Role> allowedRoles;
    private boolean enabled;
    private int maxInputTokens, maxOutputTokens;
  }

  public record Proposal(
      @NotBlank @Size(max = 120) String title,
      @NotNull @Size(max = 3000) String description,
      @NotBlank @Size(max = 3000) String acceptanceCriteria,
      @NotNull @Pattern(regexp = "low|medium|high") String priority) {}

  public record Output(
      @NotBlank @Size(max = 8000) String summary,
      @NotNull @Size(max = 8) List<@Valid Proposal> tasks,
      @NotNull @Size(max = 8) List<@NotBlank @Size(max = 3000) String> decisions,
      @NotNull @Size(max = 8) List<@NotBlank @Size(max = 2000) String> questions) {}

  public record Event(Instant at, String actor, String message) {}

  @Data
  @Document("agent_runs")
  @CompoundIndexes({
    @CompoundIndex(
        name = "run_project_history",
        def = "{'organizationId':1,'projectId':1,'createdAt':-1}"),
    @CompoundIndex(name = "run_queue", def = "{'status':1,'createdAt':1}"),
    @CompoundIndex(name = "run_lease", def = "{'status':1,'leaseUntil':1}")
  })
  public static class Run {
    @Id private String id;
    private String organizationId,
        projectId,
        agentId,
        agentName,
        providerId,
        initiatedBy,
        ownerName;
    private String taskId, parentId, instruction, originalInstruction, status, error, reviewedBy;
    private Instant createdAt;
    private List<Event> events;
    private Output output;
    private List<String> createdTaskIds;
    private int reservedTokens, accountedTokens, inputTokens, outputTokens;
    private boolean usageEstimated, costAvailable;
    private double estimatedCost;
    @JsonIgnore private String leaseHash, contextHash, configHash;
    @JsonIgnore private Instant leaseUntil;
    @JsonIgnore private boolean callStarted, settled;
    @JsonIgnore private int attempts;
  }

  @Data
  @Document("project_agent_memory")
  @CompoundIndex(name = "memory_project", def = "{'organizationId':1,'projectId':1}")
  public static class Memory {
    @Id private String id;
    private String organizationId, projectId, content, sourceRunId, approvedBy;
    private Instant createdAt;
  }
}
