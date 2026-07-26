package com.HiCaptain.demo.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class AuthResponse {
    private String token;
    private String userId;
    private String name;
    private String email;
    private String role;
    
    // Constructor for backward compatibility
    public AuthResponse(String token) {
        this.token = token;
    }
}