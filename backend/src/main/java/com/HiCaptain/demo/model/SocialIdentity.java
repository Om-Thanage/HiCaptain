package com.HiCaptain.demo.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Document("social_identities")
public class SocialIdentity {
    @Id private String id;
    @Indexed(unique = true) private String providerSubject;
    private String userId;
}
