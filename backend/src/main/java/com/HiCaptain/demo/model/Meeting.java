package com.HiCaptain.demo.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;

@Document(collection = "meetings")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class Meeting {

    @Id
    private String id;

    private String title;
    private String description;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private String meetingLink;
    private String googleMeetLink;
    private String googleEventId;
    private String agenda;
    private String location;
    private boolean isVirtual;
    private String priority; // low, medium, high
    private String type; // meeting, review, standup, etc.
    private String status; // scheduled, in-progress, completed, cancelled
    
    private String projectId;
    private String organizerId;
    private List<String> attendeeIds;
    private List<String> attendeeEmails;
    
    // Recurring meeting fields
    private boolean isRecurring;
    private String recurrenceRule; // RRULE format
    private String recurringMeetingId;
    
    // Google Calendar integration
    private String calendarId;
    private boolean syncWithGoogleCalendar;
    
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
