package com.HiCaptain.demo.controller;

import com.HiCaptain.demo.service.GoogleDriveService;
import com.HiCaptain.demo.service.GoogleTasksService;
import com.HiCaptain.demo.model.GoogleTaskLink;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/google-workspace")
public class GoogleDriveController {
    private final GoogleDriveService drive;
    private final GoogleTasksService tasks;
    public GoogleDriveController(GoogleDriveService drive, GoogleTasksService tasks) { this.drive = drive; this.tasks = tasks; }
    public record FolderRequest(String folderId) {}

    @GetMapping("/folders")
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager')")
    public List<GoogleDriveService.FolderView> folders(@RequestParam(required = false) String parentId) throws IOException {
        return drive.folders(parentId);
    }

    @PutMapping("/projects/{projectId}/folder")
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager')")
    public GoogleDriveService.FolderConfiguration configure(@PathVariable String projectId, @RequestBody FolderRequest request) throws IOException {
        return drive.configure(projectId, request.folderId());
    }

    @GetMapping("/projects/{projectId}/folder")
    public GoogleDriveService.FolderConfiguration configuration(@PathVariable String projectId) throws IOException {
        return drive.configuration(projectId);
    }

    @PostMapping("/projects/{projectId}/folder/share")
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager')")
    public GoogleDriveService.FolderConfiguration syncSharing(@PathVariable String projectId) throws IOException {
        return drive.syncSharing(projectId);
    }

    @GetMapping("/projects/{projectId}/files")
    public List<GoogleDriveService.FileView> files(@PathVariable String projectId) throws IOException { return drive.files(projectId); }

    @PostMapping(value = "/projects/{projectId}/files", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager','Developer')")
    public GoogleDriveService.FileView upload(@PathVariable String projectId, @RequestPart("file") MultipartFile file) throws IOException {
        return drive.upload(projectId, file);
    }

    @GetMapping("/projects/{projectId}/files/{fileId}/download")
    public ResponseEntity<byte[]> download(@PathVariable String projectId, @PathVariable String fileId) throws IOException {
        var file = drive.download(projectId, fileId);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(file.name(), StandardCharsets.UTF_8).build().toString())
                .contentType(MediaType.parseMediaType(file.mimeType()))
                .body(file.bytes());
    }

    @DeleteMapping("/projects/{projectId}/files/{fileId}")
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager')")
    public void delete(@PathVariable String projectId, @PathVariable String fileId) throws IOException { drive.delete(projectId, fileId); }

    @GetMapping("/projects/{projectId}/google-tasks")
    public List<String> linkedTasks(@PathVariable String projectId) { return tasks.linkedTaskIds(projectId); }

    @PostMapping("/tasks/{taskId}/copy-to-google")
    public GoogleTaskLink copyTask(@PathVariable String taskId) throws IOException { return tasks.copy(taskId); }
}
