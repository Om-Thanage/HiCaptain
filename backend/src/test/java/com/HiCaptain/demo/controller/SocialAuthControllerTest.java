package com.HiCaptain.demo.controller;

import com.HiCaptain.demo.service.JwtService;
import com.HiCaptain.demo.service.OrganizationService;
import com.HiCaptain.demo.service.SocialAuthService;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

class SocialAuthControllerTest {
    @Test
    void githubSignInStateCookieReachesTheSharedCallback() {
        var social = mock(SocialAuthService.class);
        var jwt = mock(JwtService.class);
        var controller = new SocialAuthController(social, jwt, mock(OrganizationService.class));
        when(jwt.generateOAuthState(anyString(), eq("social-github"))).thenReturn("signed-state");
        when(social.authorizationUrl("github", "signed-state")).thenReturn("https://github.com/login/oauth/authorize");
        var request = new MockHttpServletRequest("GET", "/auth/oauth/github/start");
        var response = new MockHttpServletResponse();

        controller.start("github", null, request, response);

        assertTrue(response.getHeaders("Set-Cookie").stream().anyMatch(header ->
                header.contains("hc_social_state=signed-state") && header.contains("Path=/api/auth/github")));
    }
}
