package com.HiCaptain.demo.repository;

import com.HiCaptain.demo.model.ProjectRepositoryAccess;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProjectRepositoryAccessRepository extends MongoRepository<ProjectRepositoryAccess, String> {
    
    // Find by project
    List<ProjectRepositoryAccess> findByProjectId(String projectId);
    List<ProjectRepositoryAccess> findByProjectIdAndActive(String projectId, boolean active);
    
    // Find by repository
    List<ProjectRepositoryAccess> findByRepositoryFullName(String repositoryFullName);
    Optional<ProjectRepositoryAccess> findByProjectIdAndRepositoryFullName(String projectId, String repositoryFullName);
    
    // Find by user access
    List<ProjectRepositoryAccess> findByAuthorizedUserIdsContaining(String userId);
    List<ProjectRepositoryAccess> findByAssignedDeveloperIdsContaining(String developerId);
    
    // Find by granted user
    List<ProjectRepositoryAccess> findByGrantedByUserId(String grantedByUserId);
    
    // Find active repositories for monitoring
    List<ProjectRepositoryAccess> findByMonitoringEnabledAndActive(boolean monitoringEnabled, boolean active);
    List<ProjectRepositoryAccess> findByWebhookEnabledAndActive(boolean webhookEnabled, boolean active);
    
    // Check access
    boolean existsByProjectIdAndRepositoryFullNameAndAuthorizedUserIdsContaining(
        String projectId, String repositoryFullName, String userId);
    
    boolean existsByProjectIdAndRepositoryFullNameAndActive(
        String projectId, String repositoryFullName, boolean active);
}