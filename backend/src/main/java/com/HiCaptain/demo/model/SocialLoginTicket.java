package com.HiCaptain.demo.model;

import java.time.Instant;
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Document("social_login_tickets")
public class SocialLoginTicket {
    @Id private String id;
    @Indexed(unique = true) private String tokenHash;
    @org.springframework.data.mongodb.core.mapping.Field("purgeAt")
    @Indexed(name="social_ticket_expiration", expireAfter = "0s") private Instant expiresAt;
    private String provider;
    private String subject;
    private String email;
    private String invitationToken;
}
