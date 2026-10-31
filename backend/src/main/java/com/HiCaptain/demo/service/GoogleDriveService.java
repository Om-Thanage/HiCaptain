package com.HiCaptain.demo.service;

import com.HiCaptain.demo.model.Project;
import com.HiCaptain.demo.repository.ProjectRepository;
import com.HiCaptain.demo.util.Role;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.Set;
import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.UUID;

@Service
public class GoogleDriveService {
    private static final String API = "https://www.googleapis.com/drive/v3";
    private static final String FIELDS = "id,name,mimeType,size,webViewLink,parents";
    private final OrganizationService organizations;
    private final ProjectRepository projectRepo;
    private final ProjectService projects;
    private final GoogleCalendarService google;
    private final ObjectMapper json;
    private final HttpClient http = HttpClient.newHttpClient();

    public GoogleDriveService(OrganizationService organizations, ProjectRepository projectRepo,
            ProjectService projects, GoogleCalendarService google, ObjectMapper json) {
        this.organizations = organizations;
        this.projectRepo = projectRepo;
        this.projects = projects;
        this.google = google;
        this.json = json;
    }

    public record FolderView(String id, String name, String webViewLink) {}
    public record FolderConfiguration(String folderId, String folderName, String folderUrl, String connectedBy) {}
    public record FileView(String id, String name, String mimeType, long size, String webViewLink) {}
    public record Download(String name, String mimeType, byte[] bytes) {}
    private record Access(Project project, String token) {}

    public List<FolderView> folders(String parentId) throws IOException {
        requireManager();
        String token = google.getAccessToken(organizations.currentUserId());
        String parent = parentId == null || parentId.isBlank() ? "root" : safeId(parentId);
        List<FolderView> folders = new ArrayList<>();
        String page = null;
        do {
            String clause = "'" + parent + "' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false";
            String url = listFilesUrl(clause) + (page == null ? "" : "&pageToken=" + query(page));
            JsonNode response = requestJson("GET", url, token, null, null);
            for (JsonNode folder : response.path("files")) folders.add(new FolderView(folder.path("id").asText(), folder.path("name").asText(), folder.path("webViewLink").asText("")));
            page = response.path("nextPageToken").asText(null);
        } while (page != null);
        return folders;
    }

    public FolderConfiguration configure(String projectId, String folderId) throws IOException {
        requireManager();
        Project project = visibleProject(projectId);
        String userId = organizations.currentUserId();
        String token = google.getAccessToken(userId);
        JsonNode folder = folderInfo(folderId, token);
        Map<String, String> managed = folderId.equals(project.getGoogleDriveFolderId())
                ? project.getGoogleDrivePermissionIds() : null;
        project.setGoogleDrivePermissionIds(share(project, folderId, token, managed));
        project.setGoogleDriveFolderId(folderId);
        project.setGoogleDriveOwnerUserId(userId);
        projectRepo.save(project);
        return folderView(folder, userId);
    }

    public FolderConfiguration configuration(String projectId) throws IOException {
        Project project = visibleProject(projectId);
        if (project.getGoogleDriveFolderId() == null) return null;
        Access access = access(project);
        return folderView(folderInfo(project.getGoogleDriveFolderId(), access.token()), project.getGoogleDriveOwnerUserId());
    }

    public FolderConfiguration syncSharing(String projectId) throws IOException {
        requireManager();
        Access access = access(visibleProject(projectId));
        access.project().setGoogleDrivePermissionIds(share(access.project(), access.project().getGoogleDriveFolderId(),
                access.token(), access.project().getGoogleDrivePermissionIds()));
        projectRepo.save(access.project());
        return configuration(projectId);
    }

    private JsonNode folderInfo(String folderId, String token) throws IOException {
        if ("root".equals(folderId)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a folder inside My Drive");
        JsonNode folder = requestJson("GET", API + "/files/" + safeId(folderId) + "?fields="
                + query("id,name,mimeType,webViewLink,driveId,capabilities(canAddChildren,canShare)"), token, null, null);
        if (!"application/vnd.google-apps.folder".equals(folder.path("mimeType").asText())
                || folder.hasNonNull("driveId") || !folder.path("capabilities").path("canAddChildren").asBoolean()
                || !folder.path("capabilities").path("canShare").asBoolean())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a My Drive folder you can upload to and share");
        return folder;
    }

    private FolderConfiguration folderView(JsonNode folder, String ownerId) {
        return new FolderConfiguration(folder.path("id").asText(), folder.path("name").asText(), folder.path("webViewLink").asText(""), ownerId);
    }

    private Map<String, String> share(Project project, String folderId, String token, Map<String, String> previous) throws IOException {
        Map<String, String> managed = new HashMap<>(previous == null ? Map.of() : previous);
        Map<String, String> desired = new HashMap<>();
        Set<String> participants = new LinkedHashSet<>();
        if (project.getProjectManagerId() != null) participants.add(project.getProjectManagerId());
        if (project.getClientId() != null) participants.add(project.getClientId());
        if (project.getDeveloperIds() != null) participants.addAll(project.getDeveloperIds());
        for (var member : organizations.members(organizations.currentOrgId())) {
            boolean admin = member.roles().contains(Role.Admin);
            if (admin || participants.contains(member.id())) {
                String role = member.id().equals(project.getClientId()) && !admin && !member.id().equals(project.getProjectManagerId())
                        && (project.getDeveloperIds() == null || !project.getDeveloperIds().contains(member.id())) ? "reader" : "writer";
                desired.put(member.email().toLowerCase(Locale.ROOT), role);
            }
        }
        Map<String, JsonNode> existing = new HashMap<>();
        String page = null;
        do {
            JsonNode response = requestJson("GET", API + "/files/" + safeId(folderId) + "/permissions?fields="
                    + query("permissions(id,emailAddress,role,type),nextPageToken") + "&pageSize=100"
                    + (page == null ? "" : "&pageToken=" + query(page)), token, null, null);
            for (JsonNode permission : response.path("permissions")) {
                String email = permission.path("emailAddress").asText("").toLowerCase(Locale.ROOT);
                if (!email.isBlank()) existing.put(email, permission);
            }
            page = response.path("nextPageToken").asText(null);
        } while (page != null);
        for (var entry : desired.entrySet()) {
            JsonNode permission = existing.get(entry.getKey());
            if (permission == null) {
                ObjectNode body = json.createObjectNode().put("type", "user").put("role", entry.getValue()).put("emailAddress", entry.getKey());
                JsonNode created = requestJson("POST", API + "/files/" + safeId(folderId) + "/permissions?sendNotificationEmail=true&fields=id",
                        token, "application/json", json.writeValueAsBytes(body));
                managed.put(entry.getKey(), created.path("id").asText());
            } else if (managed.containsKey(entry.getKey()) && !entry.getValue().equals(permission.path("role").asText())) {
                ObjectNode body = json.createObjectNode().put("role", entry.getValue());
                requestJson("PATCH", API + "/files/" + safeId(folderId) + "/permissions/" + safeId(permission.path("id").asText()),
                        token, "application/json", json.writeValueAsBytes(body));
            }
        }
        for (var entry : new HashMap<>(managed).entrySet()) {
            if (!desired.containsKey(entry.getKey())) {
                request("DELETE", API + "/files/" + safeId(folderId) + "/permissions/" + safeId(entry.getValue()), token, null, null);
                managed.remove(entry.getKey());
            }
        }
        return managed;
    }

    public List<FileView> files(String projectId) throws IOException {
        Access access = access(projectId);
        List<FileView> files = new ArrayList<>();
        String url = listFilesUrl("'" + safeId(access.project().getGoogleDriveFolderId()) + "' in parents and trashed = false");
        String page = null;
        do {
            JsonNode response = requestJson("GET", url + (page == null ? "" : "&pageToken=" + query(page)), access.token(), null, null);
            for (JsonNode file : response.path("files")) files.add(view(file));
            page = response.path("nextPageToken").asText(null);
        } while (page != null);
        return files;
    }

    public FileView upload(String projectId, MultipartFile file) throws IOException {
        if (file.isEmpty()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a file");
        if (file.getSize() > 10_000_000) throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "Files must be 10 MB or smaller");
        Access access = access(projectId);
        String folder = safeId(access.project().getGoogleDriveFolderId());
        String boundary = "hicaptain-" + UUID.randomUUID();
        ObjectNode metadata = json.createObjectNode().put("name", file.getOriginalFilename() == null ? "Untitled file" : file.getOriginalFilename());
        metadata.putArray("parents").add(folder);
        metadata.putObject("appProperties").put("hicaptainProjectId", projectId);
        byte[] prefix = ("--" + boundary + "\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n" + json.writeValueAsString(metadata)
                + "\r\n--" + boundary + "\r\nContent-Type: " + (file.getContentType() == null ? "application/octet-stream" : file.getContentType()) + "\r\n\r\n").getBytes(StandardCharsets.UTF_8);
        byte[] suffix = ("\r\n--" + boundary + "--\r\n").getBytes(StandardCharsets.UTF_8);
        byte[] content = file.getBytes();
        byte[] body = new byte[prefix.length + content.length + suffix.length];
        System.arraycopy(prefix, 0, body, 0, prefix.length);
        System.arraycopy(content, 0, body, prefix.length, content.length);
        System.arraycopy(suffix, 0, body, prefix.length + content.length, suffix.length);
        JsonNode created = requestJson("POST", "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=" + query(FIELDS),
                access.token(), "multipart/related; boundary=" + boundary, body);
        return view(created);
    }

    public Download download(String projectId, String fileId) throws IOException {
        Access access = access(projectId);
        JsonNode file = projectFile(access, fileId);
        if (file.path("mimeType").asText().startsWith("application/vnd.google-apps."))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Open Google documents in Drive");
        if (file.path("size").asLong() > 10_000_000)
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "Files larger than 10 MB must be opened in Drive");
        byte[] bytes = request("GET", API + "/files/" + safeId(fileId) + "?alt=media", access.token(), null, null).body();
        return new Download(file.path("name").asText(), file.path("mimeType").asText("application/octet-stream"), bytes);
    }

    public void delete(String projectId, String fileId) throws IOException {
        requireManager();
        Access access = access(projectId);
        projectFile(access, fileId);
        request("DELETE", API + "/files/" + safeId(fileId), access.token(), null, null);
    }

    private JsonNode projectFile(Access access, String fileId) throws IOException {
        JsonNode file = requestJson("GET", API + "/files/" + safeId(fileId) + "?fields=" + query(FIELDS), access.token(), null, null);
        if (!contains(file.path("parents"), access.project().getGoogleDriveFolderId())) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "File not found in this project");
        return file;
    }

    private String listFilesUrl(String clause) {
        return API + "/files?corpora=user&pageSize=100&fields="
                + query("nextPageToken,files(" + FIELDS + ")") + "&q=" + query(clause);
    }
    private Access access(String projectId) throws IOException {
        return access(visibleProject(projectId));
    }
    private Access access(Project project) throws IOException {
        if (project.getGoogleDriveFolderId() == null || project.getGoogleDriveOwnerUserId() == null)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Choose a Google Drive folder for this project first");
        organizations.membership(organizations.currentOrgId(), project.getGoogleDriveOwnerUserId());
        return new Access(project, google.getAccessToken(project.getGoogleDriveOwnerUserId()));
    }
    private Project visibleProject(String projectId) {
        return projects.getById(projectId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));
    }
    private void requireManager() {
        var roles = organizations.membership(organizations.currentOrgId(), organizations.currentUserId()).getRoles();
        if (!roles.contains(Role.Admin) && !roles.contains(Role.ProjectManager)) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
    }
    private String safeId(String id) {
        if (id == null || !id.matches("[A-Za-z0-9_-]+")) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid Google identifier");
        return id;
    }
    private boolean contains(JsonNode array, String id) {
        for (JsonNode value : array) if (id.equals(value.asText())) return true;
        return false;
    }
    private String query(String value) { return URLEncoder.encode(value, StandardCharsets.UTF_8); }
    private FileView view(JsonNode node) { return new FileView(node.path("id").asText(), node.path("name").asText(), node.path("mimeType").asText(), node.path("size").asLong(), node.path("webViewLink").asText("")); }
    private JsonNode requestJson(String method, String url, String token, String contentType, byte[] body) throws IOException {
        byte[] response = request(method, url, token, contentType, body).body();
        return response.length == 0 ? json.createObjectNode() : json.readTree(response);
    }
    private HttpResponse<byte[]> request(String method, String url, String token, String contentType, byte[] body) throws IOException {
        HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create(url)).header("Authorization", "Bearer " + token);
        if (contentType != null) builder.header("Content-Type", contentType);
        builder.method(method, body == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofByteArray(body));
        try {
            HttpResponse<byte[]> response = http.send(builder.build(), HttpResponse.BodyHandlers.ofByteArray());
            if (response.statusCode() >= 400) throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "Google Drive request failed (" + response.statusCode() + ")");
            return response;
        } catch (InterruptedException error) {
            Thread.currentThread().interrupt();
            throw new IOException("Google Drive request interrupted", error);
        }
    }
}
