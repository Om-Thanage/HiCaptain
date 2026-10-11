package com.HiCaptain.demo.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.context.ActiveProfiles;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = "spring.data.mongodb.database=hicaptain_automated_tests")
@ActiveProfiles("test")
@AutoConfigureMockMvc
class OrganizationAuthorizationTest {
    @Autowired MockMvc mvc;

    @Test
    @WithMockUser(username = "developer", authorities = "Developer")
    void developerCannotInviteMembers() throws Exception {
        mvc.perform(post("/organizations/org-1/invitations")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"someone@example.com\",\"roles\":[\"Admin\"]}"))
                .andExpect(status().isForbidden());
    }
}
