package com.HiCaptain.demo.security;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.*;
import static org.junit.jupiter.api.Assertions.*;
class AuthRateLimitFilterTest {
    @Test void excessAttemptsAreRejectedAndForwardedHeadersCannotBypassTheLimit() throws Exception {
        var filter = new AuthRateLimitFilter(2, 60); var reached = new AtomicInteger();
        for (int i=0;i<3;i++) {
            var request = new MockHttpServletRequest("POST", "/auth/login"); request.setRemoteAddr("127.0.0.1");
            request.addHeader("X-Forwarded-For", "192.0.2." + i); var response = new MockHttpServletResponse();
            filter.doFilter(request, response, (req,res) -> reached.incrementAndGet());
            assertEquals(i==2 ? 429 : 200, response.getStatus());
            if (i==2) assertEquals("60", response.getHeader("Retry-After"));
        }
        assertEquals(2, reached.get());
        var callback = new MockHttpServletRequest("GET", "/auth/oauth/google/callback");
        filter.doFilter(callback, new MockHttpServletResponse(), (req,res) -> reached.incrementAndGet());
        assertEquals(3, reached.get());
    }
}
