package com.sarthi.master.dto;

import com.sarthi.master.entity.AppUser;

import java.time.LocalDateTime;

public record UserResponse(
        Long id,
        String username,
        String fullName,
        String role,
        boolean active,
        String preferredLocale,
        String preferredTheme,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static UserResponse from(AppUser user) {
        return new UserResponse(
                user.getId(),
                user.getUsername(),
                user.getFullName(),
                user.getRole(),
                user.isActive(),
                user.getPreferredLocale(),
                user.getPreferredTheme(),
                user.getCreatedAt(),
                user.getUpdatedAt()
        );
    }
}
