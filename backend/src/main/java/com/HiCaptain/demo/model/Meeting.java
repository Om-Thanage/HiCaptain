package com.HiCaptain.demo.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "meetings")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class Meeting {

    @Id
    private String id;

    private LocalDateTime dateTime;
    private String meetingLink;
    private String agenda;

    private String projectId;
}
