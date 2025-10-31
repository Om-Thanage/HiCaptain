package com.HiCaptain.demo.dto;

import lombok.Data;

@Data
public class AuthRequest {
    private String name;
    private String password;
}