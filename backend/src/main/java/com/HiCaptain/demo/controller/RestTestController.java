package com.HiCaptain.demo.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class RestTestController {

    @GetMapping("/client/data")
    public ResponseEntity<String> studentEndpoint(){
        return ResponseEntity.ok("Hello Student or Admin, you can see this.");
    }
    
    @GetMapping("/admin/data")
    public ResponseEntity<String> parentEndpoint() {
        return ResponseEntity.ok("Hello Parent or Admin, you can see this.");
    }
}
