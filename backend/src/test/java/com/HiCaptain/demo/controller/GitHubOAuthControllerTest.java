package com.HiCaptain.demo.controller;

import com.HiCaptain.demo.service.GitHubOAuthService;
import com.HiCaptain.demo.service.JwtService;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.servlet.view.RedirectView;

import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.Mockito.*;

class GitHubOAuthControllerTest {
    @Test
    void socialSignInUsesTheSharedGitHubCallback() {
        var controller = new GitHubOAuthController();
        var social = mock(SocialAuthController.class);
        var github = mock(GitHubOAuthService.class);
        var jwt = mock(JwtService.class);
        ReflectionTestUtils.setField(controller, "socialAuthController", social);
        ReflectionTestUtils.setField(controller, "oauthService", github);
        ReflectionTestUtils.setField(controller, "jwtService", jwt);
        var request = new MockHttpServletRequest("GET", "/api/auth/github/callback");
        var response = new MockHttpServletResponse();
        var redirect = new RedirectView("/auth/oauth/callback#ticket=token");
        when(jwt.verifyOAuthState("signed-social-state", "social-github")).thenReturn("nonce");
        when(social.callback("github", "code", "signed-social-state", null, request, response)).thenReturn(redirect);

        assertSame(redirect, controller.handleGitHubCallback("code", "signed-social-state", null, null, request, response));
        verifyNoInteractions(github);
    }
}
