package com.HiCaptain.demo.service;

import com.HiCaptain.demo.model.Organization;
import com.HiCaptain.demo.model.Project;
import com.HiCaptain.demo.repository.OrganizationRepository;
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
import java.util.UUID;

@Service
public class GoogleDriveService {
    private static final String API = "https://www.googleapis.com/drive/v3";
    private static final String FIELDS = "id,name,mimeType,size,webViewLink,parents";
    private final OrganizationService organizations;
    private final OrganizationRepository organizationRepo;
    private final ProjectService projects;
    private final GoogleCalendarService google;
    private final ObjectMapper json;
    private final HttpClient http = HttpClient.newHttpClient();

    public GoogleDriveService(OrganizationService organizations, OrganizationRepository organizationRepo,
            ProjectService projects, GoogleCalendarService google, ObjectMapper json) {
        this.organizations = organizations;
        this.organizationRepo = organizationRepo;
        this.projects = projects;
        this.google = google;
        this.json = json;
    }

    public record DriveView(String id, String name) {}
    public record StorageView(String driveId, String driveName, String connectedBy) {}
    public record FileView(String id, String name, String mimeType, long size, String webViewLink) {}
    public record Download(String name, String mimeType, byte[] bytes) {}
    private record Access(Project project, Organization organization, String token) {}

    public List<DriveView> availableDrives() throws IOException {
        String token = google.getAccessToken(organizations.currentUserId());
        List<DriveView> drives = new ArrayList<>();
        String page = null;
        do {
            String url = API + "/drives?pageSize=100&fields=" + query("drives(id,name),nextPageToken")
                    + (page == null ? "" : "&pageToken=" + query(page));
            JsonNode response = requestJson("GET", url, token, null, null);
            for (JsonNode drive : response.path("drives")) drives.add(new DriveView(drive.path("id").asText(), drive.path("name").asText()));
            page = response.path("nextPageToken").asText(null);
        } while (page != null);
        return drives;
    }

    public StorageView configure(String driveId) throws IOException {
        requireAdmin();
        safeId(driveId);
        String userId = organizations.currentUserId();
        String token = google.getAccessToken(userId);
        JsonNode drive = requestJson("GET", API + "/drives/" + driveId + "?fields=id,name", token, null, null);
        Organization org = organizations.organization(organizations.currentOrgId());
        org.setGoogleSharedDriveId(drive.path("id").asText());
        org.setGoogleDriveOwnerUserId(userId);
        organizationRepo.save(org);
        return new StorageView(org.getGoogleSharedDriveId(), drive.path("name").asText(), userId);
    }

    public StorageView configuration() throws IOException {
        Organization org = organizations.organization(organizations.currentOrgId());
        if (org.getGoogleSharedDriveId() == null) return null;
        organizations.membership(org.getId(), org.getGoogleDriveOwnerUserId());
        JsonNode drive = requestJson("GET", API + "/drives/" + safeId(org.getGoogleSharedDriveId()) + "?fields=id,name",
                google.getAccessToken(org.getGoogleDriveOwnerUserId()), null, null);
        return new StorageView(org.getGoogleSharedDriveId(), drive.path("name").asText(), org.getGoogleDriveOwnerUserId());
    }

    public List<FileView> files(String projectId) throws IOException {
        Access access = access(projectId);
        String folder = folder(access, false);
        if (folder == null) return List.of();
        List<FileView> files = new ArrayList<>();
        String url = listFilesUrl(access.organization().getGoogleSharedDriveId(), "'" + folder + "' in parents and trashed = false");
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
        String folder = folder(access, true);
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
        JsonNode created = requestJson("POST", "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=" + query(FIELDS),
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
        byte[] bytes = request("GET", API + "/files/" + safeId(fileId) + "?alt=media&supportsAllDrives=true", access.token(), null, null).body();
        return new Download(file.path("name").asText(), file.path("mimeType").asText("application/octet-stream"), bytes);
    }

    public void delete(String projectId, String fileId) throws IOException {
        requireManager();
        Access access = access(projectId);
        projectFile(access, fileId);
        request("DELETE", API + "/files/" + safeId(fileId) + "?supportsAllDrives=true", access.token(), null, null);
    }

    private JsonNode projectFile(Access access, String fileId) throws IOException {
        JsonNode file = requestJson("GET", API + "/files/" + safeId(fileId) + "?supportsAllDrives=true&fields=" + query(FIELDS), access.token(), null, null);
        String folder = folder(access, false);
        if (folder == null || !contains(file.path("parents"), folder)) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "File not found in this project");
        return file;
    }

    private String folder(Access access, boolean create) throws IOException {
        String driveId = safeId(access.organization().getGoogleSharedDriveId());
        String clause = "'" + driveId + "' in parents and mimeType = 'application/vnd.google-apps.folder' and appProperties has { key = 'hicaptainProjectId' and value = '" + safeId(access.project().getId()) + "' } and trashed = false";
        JsonNode response = requestJson("GET", listFilesUrl(driveId, clause), access.token(), null, null);
        if (response.path("files").size() > 0) return response.path("files").get(0).path("id").asText();
        if (!create) return null;
        ObjectNode metadata = json.createObjectNode().put("name", access.project().getName());
        metadata.put("mimeType", "application/vnd.google-apps.folder");
        metadata.putArray("parents").add(driveId);
        metadata.putObject("appProperties").put("hicaptainProjectId", access.project().getId());
        return requestJson("POST", API + "/files?supportsAllDrives=true&fields=id", access.token(), "application/json", json.writeValueAsBytes(metadata)).path("id").asText();
    }

    private String listFilesUrl(String driveId, String clause) {
        return API + "/files?corpora=drive&driveId=" + query(driveId) + "&includeItemsFromAllDrives=true&supportsAllDrives=true&pageSize=100&fields="
                + query("nextPageToken,files(" + FIELDS + ")") + "&q=" + query(clause);
    }
    private Access access(String projectId) throws IOException {
        Project project = projects.getById(projectId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));
        Organization org = organizations.organization(organizations.currentOrgId());
        if (org.getGoogleSharedDriveId() == null || org.getGoogleDriveOwnerUserId() == null)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Connect a Workspace Shared Drive in Settings first");
        organizations.membership(org.getId(), org.getGoogleDriveOwnerUserId());
        return new Access(project, org, google.getAccessToken(org.getGoogleDriveOwnerUserId()));
    }
    private void requireAdmin() {
        if (!organizations.membership(organizations.currentOrgId(), organizations.currentUserId()).getRoles().contains(Role.Admin))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
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
