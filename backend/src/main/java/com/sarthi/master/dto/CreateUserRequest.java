package com.sarthi.master.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateUserRequest(
        @NotBlank @Size(min = 3, max = 50) String username,
        @NotBlank @Size(min = 1, max = 100) String fullName,
        @NotBlank String role,
        @NotBlank @Size(min = 6, max = 100) String password
) {}
