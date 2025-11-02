package com.HiCaptain.demo.model;

import com.HiCaptain.demo.util.Role;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

@Document(collection = "users")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class User {
    @Id
    private String id;
    @Field("username")
    private String name;
    private String email;
    private String password;
    private Role role;
    // Newly added: list of project IDs this user is associated with (client/PM/developer)
    private List<String> projectIds;
    private List<String> taskIds;
}