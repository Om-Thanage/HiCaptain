package com.HiCaptain.demo.model;

import com.HiCaptain.demo.util.Role;
import java.time.Instant;
import java.util.Set;
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Document("invitations")
public class Invitation {
    @Id private String id;
    private String organizationId;
    private String email;
    private Set<Role> roles;
    private Set<String> projectIds;
    private Role projectRole;
    @Indexed(unique = true) private String tokenHash;
    private Instant expiresAt;
    private Instant acceptedAt;
}
