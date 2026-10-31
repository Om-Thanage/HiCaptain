package com.HiCaptain.demo.agent;

import com.HiCaptain.demo.agent.AgentModels.Output;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/internal/agents")
public class AgentWorkerController {
  private final AgentService agents;
  private final String secret;

  public AgentWorkerController(
      AgentService agents, @Value("${AGENT_WORKER_SECRET:}") String secret) {
    this.agents = agents;
    this.secret = secret;
  }

  @ModelAttribute
  public void authenticate(
      @RequestHeader(value = "X-Agent-Worker-Key", defaultValue = "") String provided) {
    if (secret.length() < 32
        || !MessageDigest.isEqual(
            secret.getBytes(StandardCharsets.UTF_8), provided.getBytes(StandardCharsets.UTF_8)))
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid worker credentials");
  }

  @PostMapping("/claim")
  public Map<String, Object> claim() {
    return agents.claim();
  }

  @GetMapping("/{id}/context")
  public Map<String, Object> context(
      @PathVariable String id, @RequestHeader("X-Agent-Run-Token") String token) {
    return agents.context(id, token);
  }

  public record Begin(@NotBlank String contextHash) {}

  @PostMapping("/{id}/begin")
  public void begin(
      @PathVariable String id,
      @RequestHeader("X-Agent-Run-Token") String token,
      @Valid @RequestBody Begin in) {
    agents.begin(id, token, in.contextHash());
  }

  @PostMapping("/{id}/heartbeat")
  public void heartbeat(@PathVariable String id, @RequestHeader("X-Agent-Run-Token") String token) {
    agents.heartbeat(id, token);
  }

  public record Completion(
      @Valid @NotNull Output output,
      @Min(0) int inputTokens,
      @Min(0) int outputTokens,
      boolean usageEstimated) {}

  @PostMapping("/{id}/complete")
  public void complete(
      @PathVariable String id,
      @RequestHeader("X-Agent-Run-Token") String token,
      @Valid @RequestBody Completion in) {
    agents.complete(
        id, token, in.output(), in.inputTokens(), in.outputTokens(), in.usageEstimated());
  }

  @PostMapping("/{id}/failed")
  public void failed(@PathVariable String id, @RequestHeader("X-Agent-Run-Token") String token) {
    agents.failed(id, token);
  }
}
