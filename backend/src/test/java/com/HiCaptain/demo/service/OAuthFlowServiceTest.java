package com.HiCaptain.demo.service;
import jakarta.servlet.http.Cookie;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
class OAuthFlowServiceTest {
    @Test void callbackRequiresItsInitiatingBrowsersCookie() {
        var mongo = mock(MongoTemplate.class); var flow = new OAuthFlowService(mongo);
        assertThrows(Exception.class, () -> flow.consume("signed-state", "github", new MockHttpServletRequest(), new MockHttpServletResponse()));
        verifyNoInteractions(mongo);
    }
    @Test void matchingCallbackIsConsumedOnceAndUsesHttpOnlyCookies() {
        var mongo = mock(MongoTemplate.class); var flow = new OAuthFlowService(mongo);
        var request = new MockHttpServletRequest(); request.setSecure(true); var response = new MockHttpServletResponse();
        flow.bind("signed-state", "github", request, response);
        String cookie = response.getHeader("Set-Cookie"); assertTrue(cookie.contains("HttpOnly")); assertTrue(cookie.contains("Secure"));
        String nonce = cookie.substring(cookie.indexOf('=') + 1, cookie.indexOf(';'));
        request.setCookies(new Cookie("hc_oauth_github", nonce));
        when(mongo.findAndRemove(any(), eq(OAuthFlowService.Flow.class)))
                .thenReturn(new OAuthFlowService.Flow("hash", "github", "browser", Instant.now().plusSeconds(60))).thenReturn(null);
        flow.consume("signed-state", "github", request, response);
        assertThrows(Exception.class, () -> flow.consume("signed-state", "github", request, response));
    }
}
