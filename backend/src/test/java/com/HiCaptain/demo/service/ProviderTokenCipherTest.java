package com.HiCaptain.demo.service;
import com.HiCaptain.demo.model.GitHubConnection;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
class ProviderTokenCipherTest {
    private final ProviderTokenCipher cipher = new ProviderTokenCipher("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=");
    @Test void credentialsRoundTripWithUniqueAuthenticatedEncryption() {
        String first = cipher.encrypt("private-token");
        assertNotEquals(first, cipher.encrypt("private-token"));
        assertEquals("private-token", cipher.decrypt(first));
        assertThrows(Exception.class, () -> cipher.decrypt(first.substring(0, first.length()-4) + "AAAA"));
        assertThrows(Exception.class, () -> new ProviderTokenCipher("").encrypt("private-token"));
    }
    @Test void credentialsAreNotSerialized() throws Exception {
        var connection = new GitHubConnection(); connection.setAccessToken("private-token"); connection.setRefreshToken("refresh");
        String json = new ObjectMapper().writeValueAsString(connection);
        assertFalse(json.contains("accessToken")); assertFalse(json.contains("refreshToken"));
    }
}
