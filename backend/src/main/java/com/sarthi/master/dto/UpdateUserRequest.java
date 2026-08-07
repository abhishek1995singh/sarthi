package com.sarthi.master.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateUserRequest(
        @NotBlank @Size(min = 1, max = 100) String fullName,
        @NotBlank String role
) {}
