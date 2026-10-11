package com.HiCaptain.demo.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document("google_task_links")
public record GoogleTaskLink(@Id String id, String userId, String projectId, String taskId, String googleListId, String googleTaskId) {}
