package com.HiCaptain.demo.service;

import com.HiCaptain.demo.model.GoogleTaskLink;
import com.HiCaptain.demo.model.Project;
import com.HiCaptain.demo.model.Task;
import com.HiCaptain.demo.repository.GoogleTaskLinkRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.ZoneOffset;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class GoogleTasksService {
    private static final String API = "https://tasks.googleapis.com/tasks/v1";
    private final GoogleCalendarService google;
    private final GoogleTaskLinkRepository links;
    private final OrganizationService organizations;
    private final TaskService tasks;
    private final ProjectService projects;
    private final ObjectMapper json;
    private final HttpClient http = HttpClient.newHttpClient();

    public GoogleTasksService(GoogleCalendarService google, GoogleTaskLinkRepository links, OrganizationService organizations,
            TaskService tasks, ProjectService projects, ObjectMapper json) {
        this.google = google;
        this.links = links;
        this.organizations = organizations;
        this.tasks = tasks;
        this.projects = projects;
        this.json = json;
    }

    public List<String> linkedTaskIds(String projectId) {
        projects.getById(projectId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));
        return links.findByUserIdAndProjectId(organizations.currentUserId(), projectId).stream().map(GoogleTaskLink::taskId).toList();
    }

    public GoogleTaskLink copy(String taskId) throws IOException {
        Task task = tasks.getById(taskId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Task not found"));
        Project project = projects.getById(task.getProjectId()).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));
        String userId = organizations.currentUserId();
        String linkId = userId + ":" + taskId;
        var existing = links.findById(linkId);
        if (existing.isPresent()) return existing.get();
        String token = google.getAccessToken(userId);
        String listId = defaultList(token);
        ObjectNode body = json.createObjectNode().put("title", task.getTitle());
        body.put("notes", "HiCaptain project: " + project.getName() + (task.getDescription() == null ? "" : "\n\n" + task.getDescription()));
        if (task.getDeadline() != null) body.put("due", task.getDeadline().atStartOfDay().toInstant(ZoneOffset.UTC).toString());
        JsonNode created = request("POST", API + "/lists/" + URLEncoder.encode(listId, StandardCharsets.UTF_8) + "/tasks", token, body);
        return links.save(new GoogleTaskLink(linkId, userId, project.getId(), taskId, listId, created.path("id").asText()));
    }

    private String defaultList(String token) throws IOException {
        JsonNode lists = request("GET", API + "/users/@me/lists?maxResults=100", token, null);
        for (JsonNode list : lists.path("items")) if ("HiCaptain".equals(list.path("title").asText())) return list.path("id").asText();
        ObjectNode body = json.createObjectNode().put("title", "HiCaptain");
        return request("POST", API + "/users/@me/lists", token, body).path("id").asText();
    }

    private JsonNode request(String method, String url, String token, ObjectNode body) throws IOException {
        HttpRequest.Builder request = HttpRequest.newBuilder(URI.create(url)).header("Authorization", "Bearer " + token);
        if (body != null) request.header("Content-Type", "application/json");
        request.method(method, body == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofByteArray(json.writeValueAsBytes(body)));
        try {
            HttpResponse<String> response = http.send(request.build(), HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 400) throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "Google Tasks request failed (" + response.statusCode() + ")");
            return json.readTree(response.body());
        } catch (InterruptedException error) {
            Thread.currentThread().interrupt();
            throw new IOException("Google Tasks request interrupted", error);
        }
    }
}
