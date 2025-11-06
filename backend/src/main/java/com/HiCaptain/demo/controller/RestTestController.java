package com.HiCaptain.demo.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class RestTestController {

    @GetMapping("/client/data")
    @PreAuthorize("hasAnyAuthority('Admin','Client')")
    public ResponseEntity<String> studentEndpoint(){
        return ResponseEntity.ok("Hello Student or Admin, you can see this.");
    }
    
    @GetMapping("/admin/data")
    @PreAuthorize("hasAuthority('Admin')")
    public ResponseEntity<String> parentEndpoint() {
        return ResponseEntity.ok("Hello Parent or Admin, you can see this.");
    }
}
