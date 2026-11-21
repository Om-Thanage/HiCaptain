package com.HiCaptain.demo.controller;

import com.HiCaptain.demo.model.Membership;
import com.HiCaptain.demo.model.Organization;
import com.HiCaptain.demo.model.User;
import com.HiCaptain.demo.repository.MembershipRepository;
import com.HiCaptain.demo.repository.OrganizationRepository;
import com.HiCaptain.demo.repository.UserRepository;
import com.HiCaptain.demo.service.JwtService;
import com.HiCaptain.demo.util.Role;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Proves Admin-only organization endpoints are enforced server-side.
 *
 * Every request carries a real signed JWT and passes through the production
 * JwtAuthFilter, which loads roles from the stored membership. The org and its
 * members exist, so a 403 can only come from the role check. Each denial has a
 * matching Admin request that succeeds on the same endpoint, and the database is
 * checked to confirm a denied request changed nothing.
 */
@SpringBootTest(properties = "spring.data.mongodb.database=hicaptain_automated_tests")
@ActiveProfiles("test")
@AutoConfigureMockMvc
class OrganizationAuthorizationTest {
    @Autowired MockMvc mvc;
    @Autowired JwtService jwt;
    @Autowired UserRepository users;
    @Autowired OrganizationRepository organizations;
    @Autowired MembershipRepository memberships;

    private String orgId;
    private User admin;
    private User developer;
    private User peer;

    @BeforeEach
    void seed() {
        String run = UUID.randomUUID().toString();
        admin = user(run, "admin");
        developer = user(run, "developer");
        peer = user(run, "peer");

        Organization org = new Organization();
        org.setId("org-" + run);
        org.setName("RBAC test org");
        org.setOwnerUserId(admin.getId());
        orgId = organizations.save(org).getId();

        member(admin, Role.Admin);
        member(developer, Role.Developer);
        member(peer, Role.Developer);
    }

    @AfterEach
    void cleanUp() {
        memberships.deleteAll(memberships.findByOrganizationId(orgId));
        organizations.deleteById(orgId);
        users.deleteAll(java.util.List.of(admin, developer, peer));
    }

    @Test
    void developerCannotPromoteThemselvesToAdmin() throws Exception {
        mvc.perform(put("/organizations/{org}/members/{user}/roles", orgId, developer.getId())
                        .header("Authorization", bearer(developer))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"roles\":[\"Admin\"]}"))
                .andExpect(status().isForbidden());

        assertEquals(Set.of(Role.Developer), rolesOf(developer));
    }

    @Test
    void developerCannotRemoveAnotherMember() throws Exception {
        mvc.perform(delete("/organizations/{org}/members/{user}", orgId, peer.getId())
                        .header("Authorization", bearer(developer)))
                .andExpect(status().isForbidden());

        assertTrue(memberships.findByOrganizationIdAndUserId(orgId, peer.getId()).isPresent());
    }

    @Test
    void developerCannotInviteMembers() throws Exception {
        mvc.perform(post("/organizations/{org}/invitations", orgId)
                        .header("Authorization", bearer(developer))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"someone@example.com\",\"roles\":[\"Admin\"]}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminCanChangeRolesOnTheSameEndpoint() throws Exception {
        // Positive control: the endpoint works for an Admin, so the developer's 403 is role-based.
        mvc.perform(put("/organizations/{org}/members/{user}/roles", orgId, peer.getId())
                        .header("Authorization", bearer(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"roles\":[\"Developer\",\"ProjectManager\"]}"))
                .andExpect(status().isOk());

        assertEquals(Set.of(Role.Developer, Role.ProjectManager), rolesOf(peer));
    }

    @Test
    void demotedAdminsOldTokenNoLongerGrantsAdminAccess() throws Exception {
        // The token is issued while the peer is an Admin, so its claims say Admin.
        setRoles(peer, Role.Admin);
        String staleAdminToken = bearer(peer);
        setRoles(peer, Role.Developer);

        mvc.perform(put("/organizations/{org}/members/{user}/roles", orgId, developer.getId())
                        .header("Authorization", staleAdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"roles\":[\"Admin\"]}"))
                .andExpect(status().isForbidden());

        assertEquals(Set.of(Role.Developer), rolesOf(developer));
    }

    @Test
    void requestWithoutTokenIsRejected() throws Exception {
        mvc.perform(put("/organizations/{org}/members/{user}/roles", orgId, developer.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"roles\":[\"Admin\"]}"))
                .andExpect(status().isForbidden());

        assertEquals(Set.of(Role.Developer), rolesOf(developer));
    }

    private User user(String run, String name) {
        User user = new User();
        user.setId(name + "-" + run);
        user.setName(name);
        user.setEmail(name + "-" + run + "@rbac.test");
        user.setPassword("not-used-for-token-tests");
        return users.save(user);
    }

    private void member(User user, Role role) {
        Membership membership = new Membership();
        membership.setOrganizationId(orgId);
        membership.setUserId(user.getId());
        membership.setRoles(Set.of(role));
        memberships.save(membership);
    }

    private void setRoles(User user, Role role) {
        Membership membership = memberships.findByOrganizationIdAndUserId(orgId, user.getId()).orElseThrow();
        membership.setRoles(Set.of(role));
        memberships.save(membership);
    }

    private Set<Role> rolesOf(User user) {
        return memberships.findByOrganizationIdAndUserId(orgId, user.getId()).orElseThrow().getRoles();
    }

    private String bearer(User user) {
        Membership membership = memberships.findByOrganizationIdAndUserId(orgId, user.getId()).orElseThrow();
        return "Bearer " + jwt.generateToken(user, membership);
    }
}
