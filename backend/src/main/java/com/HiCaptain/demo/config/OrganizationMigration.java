package com.HiCaptain.demo.config;

import com.HiCaptain.demo.model.Membership;
import com.HiCaptain.demo.model.Organization;
import com.HiCaptain.demo.model.Project;
import com.HiCaptain.demo.model.User;
import com.HiCaptain.demo.repository.MembershipRepository;
import com.HiCaptain.demo.repository.OrganizationRepository;
import com.HiCaptain.demo.repository.ProjectRepository;
import com.HiCaptain.demo.repository.UserRepository;
import com.HiCaptain.demo.util.Role;
import java.util.Set;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

@Configuration
public class OrganizationMigration {
    @Bean
    @Profile("!demo & !test")
    CommandLineRunner migrateLegacyWorkspace(UserRepository users, OrganizationRepository organizations,
            MembershipRepository memberships, ProjectRepository projects) {
        return args -> {
            var legacy = users.findAll().stream().filter(user -> memberships.findByUserId(user.getId()).isEmpty()).toList();
            Organization org = organizations.findById("legacy-workspace").orElse(null);
            if (legacy.isEmpty() && org == null) return;
            if (org == null) {
                User owner = legacy.stream().filter(user -> user.getRole() == Role.Admin).findFirst().orElse(legacy.get(0));
                org = new Organization();
                org.setId("legacy-workspace");
                org.setName("Existing workspace");
                org.setOwnerUserId(owner.getId());
                org = organizations.save(org);
            }
            for (User user : legacy) {
                Membership member = new Membership();
                member.setOrganizationId(org.getId());
                member.setUserId(user.getId());
                member.setRoles(Set.of(user.getId().equals(org.getOwnerUserId()) ? Role.Admin : user.getRole() == null ? Role.Client : user.getRole()));
                memberships.save(member);
            }
            for (Project project : projects.findAll()) {
                if (project.getOrganizationId() == null) {
                    project.setOrganizationId(org.getId());
                    projects.save(project);
                }
            }
        };
    }
}
