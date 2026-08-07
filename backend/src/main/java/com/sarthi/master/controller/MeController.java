package com.sarthi.master.controller;

import com.sarthi.common.response.ApiResponse;
import com.sarthi.master.dto.UserPreferencesRequest;
import com.sarthi.master.dto.UserPreferencesResponse;
import com.sarthi.master.dto.UserResponse;
import com.sarthi.master.service.CurrentUserService;
import com.sarthi.master.service.UserManagementService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/me")
public class MeController {

    private final CurrentUserService currentUserService;
    private final UserManagementService userManagementService;

    public MeController(CurrentUserService currentUserService,
                        UserManagementService userManagementService) {
        this.currentUserService = currentUserService;
        this.userManagementService = userManagementService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<UserResponse>> me() {
        return ResponseEntity.ok(ApiResponse.ok(UserResponse.from(currentUserService.requireCurrentUser())));
    }

    @GetMapping("/preferences")
    public ResponseEntity<ApiResponse<UserPreferencesResponse>> getPreferences() {
        return ResponseEntity.ok(ApiResponse.ok(userManagementService.getPreferences()));
    }

    @PutMapping("/preferences")
    public ResponseEntity<ApiResponse<UserPreferencesResponse>> updatePreferences(
            @RequestBody UserPreferencesRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Preferences saved", userManagementService.updatePreferences(request)));
    }
}
