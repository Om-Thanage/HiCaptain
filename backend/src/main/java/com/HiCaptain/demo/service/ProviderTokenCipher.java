package com.HiCaptain.demo.service;

import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.Base64;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class ProviderTokenCipher {
    private final String key;
    public ProviderTokenCipher(@Value("${provider.token-key:${google.workspace.token-key:}}") String key) { this.key = key; }
    public boolean isEncrypted(String value) { return value != null && value.startsWith("v1:"); }
    public String encrypt(String value) {
        try {
            byte[] iv = new byte[12]; new SecureRandom().nextBytes(iv);
            Cipher cipher = cipher(Cipher.ENCRYPT_MODE, iv);
            byte[] encrypted = cipher.doFinal(value.getBytes(StandardCharsets.UTF_8));
            byte[] result = Arrays.copyOf(iv, iv.length + encrypted.length);
            System.arraycopy(encrypted, 0, result, iv.length, encrypted.length);
            return "v1:" + Base64.getEncoder().encodeToString(result);
        } catch (Exception error) { throw unavailable(); }
    }
    public String decrypt(String value) {
        try {
            if (!isEncrypted(value)) throw new IllegalArgumentException();
            byte[] bytes = Base64.getDecoder().decode(value.substring(3));
            return new String(cipher(Cipher.DECRYPT_MODE, Arrays.copyOf(bytes, 12)).doFinal(bytes, 12, bytes.length - 12), StandardCharsets.UTF_8);
        } catch (Exception error) { throw unavailable(); }
    }
    private Cipher cipher(int mode, byte[] iv) throws Exception {
        byte[] bytes = Base64.getDecoder().decode(key);
        if (bytes.length != 32) throw new IllegalArgumentException();
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(mode, new SecretKeySpec(bytes, "AES"), new GCMParameterSpec(128, iv));
        return cipher;
    }
    private ResponseStatusException unavailable() {
        return new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Provider token encryption is unavailable. Configure a stable PROVIDER_TOKEN_ENCRYPTION_KEY or reconnect after key rotation.");
    }
}
