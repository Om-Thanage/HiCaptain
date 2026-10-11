package com.HiCaptain.demo.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Document("organizations")
public class Organization {
    @Id private String id;
    private String name;
    private String ownerUserId;
    private String googleSharedDriveId;
    private String googleDriveOwnerUserId;
}
