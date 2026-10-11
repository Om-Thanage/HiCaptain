package com.HiCaptain.demo.model;

import com.HiCaptain.demo.util.Role;
import java.util.Set;
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Document("memberships")
@CompoundIndex(name = "org_user_unique", def = "{'organizationId': 1, 'userId': 1}", unique = true)
public class Membership {
    @Id private String id;
    private String organizationId;
    private String userId;
    private Set<Role> roles;
}
