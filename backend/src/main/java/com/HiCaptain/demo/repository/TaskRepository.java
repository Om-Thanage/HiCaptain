package com.HiCaptain.demo.repository;

import com.HiCaptain.demo.model.Task;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface TaskRepository extends MongoRepository<Task, String> {
}
