package com.HiCaptain.demo.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "google_workspace_connections")
public record GoogleWorkspaceConnection(@Id String userId, String encryptedRefreshToken) {}
