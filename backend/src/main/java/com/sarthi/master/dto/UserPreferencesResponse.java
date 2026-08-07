package com.sarthi.master.dto;

import com.sarthi.master.entity.AppUser;

public record UserPreferencesResponse(
        String preferredLocale,
        String preferredTheme
) {
    public static UserPreferencesResponse from(AppUser user) {
        return new UserPreferencesResponse(user.getPreferredLocale(), user.getPreferredTheme());
    }
}
