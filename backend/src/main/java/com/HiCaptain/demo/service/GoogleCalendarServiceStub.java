package com.HiCaptain.demo.service;

import com.HiCaptain.demo.model.Meeting;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingClass;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.ArrayList;

@Service
@ConditionalOnMissingClass("com.google.api.services.calendar.Calendar")
public class GoogleCalendarServiceStub {

    public Meeting createMeetingWithGoogleMeet(Meeting meeting) {
        // Return the meeting without Google integration
        meeting.setMeetingLink("Google Calendar integration not available");
        return meeting;
    }

    public List<Object> getCalendarEvents(String userId, int days) {
        return new ArrayList<>();
    }

    public String getAuthorizationUrl(String userId) {
        return "Google Calendar integration not available";
    }

    public void handleCallback(String code, String state) {
        // No-op
    }
}