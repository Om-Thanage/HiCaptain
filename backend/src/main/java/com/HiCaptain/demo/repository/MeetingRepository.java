package com.HiCaptain.demo.repository;

import com.HiCaptain.demo.model.Meeting;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface MeetingRepository extends MongoRepository<Meeting, String> {
    List<Meeting> findByProjectId(String projectId);
    List<Meeting> findByOrganizerIdOrderByStartTimeDesc(String organizerId);
    List<Meeting> findByAttendeeIdsContaining(String attendeeId);
    List<Meeting> findByStartTimeAfterOrderByStartTimeAsc(LocalDateTime startTime);
    List<Meeting> findByStartTimeBetween(LocalDateTime startTime, LocalDateTime endTime);
    List<Meeting> findByIsRecurring(boolean isRecurring);
    List<Meeting> findByStatus(String status);
    List<Meeting> findByType(String type);
    List<Meeting> findByGoogleEventIdNotNull();
    void deleteByProjectId(String projectId);
}
