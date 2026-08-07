package com.sarthi.master.controller;

import com.sarthi.common.response.ApiResponse;
import com.sarthi.master.dto.*;
import com.sarthi.master.service.UserManagementService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/users")
public class UserController {

    private final UserManagementService userManagementService;

    public UserController(UserManagementService userManagementService) {
        this.userManagementService = userManagementService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<UserResponse>>> list() {
        return ResponseEntity.ok(ApiResponse.ok(userManagementService.listUsers()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<UserResponse>> get(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(userManagementService.getById(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<UserResponse>> create(@Valid @RequestBody CreateUserRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("User created", userManagementService.create(request)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<UserResponse>> update(
            @PathVariable Long id, @Valid @RequestBody UpdateUserRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("User updated", userManagementService.update(id, request)));
    }

    @PostMapping("/{id}/disable")
    public ResponseEntity<ApiResponse<UserResponse>> disable(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok("User disabled", userManagementService.disable(id)));
    }

    @PostMapping("/{id}/enable")
    public ResponseEntity<ApiResponse<UserResponse>> enable(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok("User enabled", userManagementService.enable(id)));
    }

    @PostMapping("/{id}/reset-password")
    public ResponseEntity<ApiResponse<Void>> resetPassword(
            @PathVariable Long id, @Valid @RequestBody ResetPasswordRequest request) {
        userManagementService.resetPassword(id, request);
        return ResponseEntity.ok(ApiResponse.ok("Password reset", null));
    }
}
