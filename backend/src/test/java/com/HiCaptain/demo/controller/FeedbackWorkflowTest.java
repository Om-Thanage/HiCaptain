package com.HiCaptain.demo.controller;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;

import com.HiCaptain.demo.model.*;
import com.HiCaptain.demo.repository.*;
import com.HiCaptain.demo.service.JwtService;
import com.HiCaptain.demo.util.Role;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDate;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

/** Feedback is authored by the server, readable by project members and triaged by managers. */
@SpringBootTest(properties = "spring.data.mongodb.database=hicaptain_automated_tests")
@ActiveProfiles("test")
@AutoConfigureMockMvc
class FeedbackWorkflowTest {
  @Autowired MockMvc mvc;
  @Autowired ObjectMapper json;
  @Autowired JwtService jwt;
  @Autowired UserRepository users;
  @Autowired MembershipRepository memberships;
  @Autowired ProjectRepository projects;
  @Autowired FeedbackRepository feedback;

  String org, project;
  Map<String, User> people = new HashMap<>();
  Map<String, String> tokens = new HashMap<>();

  @BeforeEach
  void seed() {
    org = "feedback-test-" + UUID.randomUUID();
    member("client", Role.Client);
    member("developer", Role.Developer);
    member("manager", Role.ProjectManager);
    member("outsider", Role.Developer);
    Project p = new Project();
    p.setOrganizationId(org);
    p.setName("Feedback workflow");
    p.setStatus("in-progress");
    p.setStartDate(LocalDate.now());
    p.setClientId(people.get("client").getId());
    p.setProjectManagerId(people.get("manager").getId());
    p.setDeveloperIds(List.of(people.get("developer").getId()));
    project = projects.insert(p).getId();
  }

  @AfterEach
  void cleanup() {
    feedback.deleteAll(feedback.findAll().stream().filter(f -> project.equals(f.getProjectId())).toList());
    projects.deleteById(project);
    memberships.deleteAll(memberships.findByOrganizationId(org));
    users.deleteAll(people.values());
  }

  void member(String name, Role role) {
    User u = new User();
    u.setName(name);
    u.setEmail(UUID.randomUUID() + "@feedback.test");
    u = users.insert(u);
    Membership m = new Membership();
    m.setOrganizationId(org);
    m.setUserId(u.getId());
    m.setRoles(Set.of(role));
    memberships.insert(m);
    people.put(name, u);
    tokens.put(name, jwt.generateToken(u, m));
  }

  JsonNode call(MockHttpServletRequestBuilder builder, String who, Object body, int expected)
      throws Exception {
    builder.header("Authorization", "Bearer " + tokens.get(who));
    if (body != null)
      builder.contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsBytes(body));
    var response = mvc.perform(builder).andReturn().getResponse();
    assertEquals(expected, response.getStatus(), response.getContentAsString());
    return response.getContentAsByteArray().length == 0
        ? json.nullNode()
        : json.readTree(response.getContentAsByteArray());
  }

  @Test
  void serverSetsAuthorDateAndStatusAndTriageNeverRewritesThem() throws Exception {
    String manager = people.get("manager").getId();
    JsonNode created =
        call(
            post("/feedback"),
            "client",
            Map.of(
                "projectId", project,
                "message", "  Checkout times out on mobile  ",
                "userId", manager,
                "status", "resolved",
                "dateIssued", "2020-01-01"),
            201);
    assertEquals(people.get("client").getId(), created.path("userId").asText());
    assertEquals("open", created.path("status").asText());
    assertEquals(LocalDate.now().toString(), created.path("dateIssued").asText());
    assertEquals("Checkout times out on mobile", created.path("message").asText());
    String id = created.path("id").asText();

    assertEquals(1, call(get("/feedback"), "developer", null, 200).size());
    assertEquals(0, call(get("/feedback"), "outsider", null, 200).size());

    var triage = new HashMap<String, Object>();
    triage.put("projectId", project);
    triage.put("message", "Checkout times out on mobile");
    triage.put("status", "resolved");
    triage.put("userId", manager);
    triage.put("dateIssued", "2020-01-01");
    call(put("/feedback/" + id), "developer", triage, 403);
    JsonNode resolved = call(put("/feedback/" + id), "manager", triage, 200);
    assertEquals("resolved", resolved.path("status").asText());
    assertEquals(people.get("client").getId(), resolved.path("userId").asText());
    assertEquals(LocalDate.now().toString(), resolved.path("dateIssued").asText());

    triage.put("status", "closed");
    call(put("/feedback/" + id), "manager", triage, 400);
    call(post("/feedback"), "client", Map.of("projectId", project, "message", "   "), 400);
  }
}
