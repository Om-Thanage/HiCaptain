package com.HiCaptain.demo.agent;

import com.HiCaptain.demo.agent.AgentModels.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/agents")
public class AgentController {
  private final AgentService agents;

  public AgentController(AgentService agents) {
    this.agents = agents;
  }

  @GetMapping("/providers")
  public List<Provider> providers() {
    return agents.providers();
  }

  @PostMapping("/providers")
  public Provider provider(@Valid @RequestBody AgentService.ProviderInput in) {
    return agents.saveProvider(null, in);
  }

  @PutMapping("/providers/{id}")
  public Provider provider(
      @PathVariable String id, @Valid @RequestBody AgentService.ProviderInput in) {
    return agents.saveProvider(id, in);
  }

  @GetMapping("/projects/{project}/choices")
  public List<Map<String, Object>> choices(@PathVariable String project) {
    return agents.choices(project);
  }

  @GetMapping("/projects/{project}")
  public List<Agent> agents(@PathVariable String project) {
    return agents.agents(project);
  }

  @PostMapping("/projects/{project}")
  public Agent agent(@PathVariable String project, @Valid @RequestBody AgentService.AgentInput in) {
    return agents.saveAgent(project, null, in);
  }

  @PutMapping("/projects/{project}/{id}")
  public Agent agent(
      @PathVariable String project,
      @PathVariable String id,
      @Valid @RequestBody AgentService.AgentInput in) {
    return agents.saveAgent(project, id, in);
  }

  @GetMapping("/projects/{project}/runs")
  public List<Run> runs(@PathVariable String project) {
    return agents.runs(project);
  }

  @PostMapping("/projects/{project}/runs")
  public Run assign(@PathVariable String project, @Valid @RequestBody AgentService.Assignment in) {
    return agents.assign(project, in);
  }

  @PostMapping("/projects/{project}/runs/{id}/cancel")
  public Run cancel(@PathVariable String project, @PathVariable String id) {
    return agents.cancel(project, id);
  }

  public record Review(boolean accept) {}

  @PostMapping("/projects/{project}/runs/{id}/review")
  public Run review(@PathVariable String project, @PathVariable String id, @RequestBody Review in) {
    return agents.review(project, id, in.accept());
  }

  @GetMapping("/projects/{project}/memory")
  public List<Memory> memory(@PathVariable String project) {
    return agents.memory(project);
  }

  public record Note(@NotBlank @Size(max = 3000) String content) {}

  @PostMapping("/projects/{project}/memory")
  public Memory note(@PathVariable String project, @Valid @RequestBody Note in) {
    return agents.remember(project, in.content());
  }

  @DeleteMapping("/projects/{project}/memory/{id}")
  public void forget(@PathVariable String project, @PathVariable String id) {
    agents.forget(project, id);
  }
}
