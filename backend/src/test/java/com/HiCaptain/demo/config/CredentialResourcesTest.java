package com.HiCaptain.demo.config;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertNull;
class CredentialResourcesTest {
    @Test void artifactDoesNotBundleGoogleCredentials() {
        assertNull(getClass().getResource("/credentials.json"));
    }
}
