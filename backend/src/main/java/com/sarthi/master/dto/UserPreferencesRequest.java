package com.sarthi.master.dto;

public record UserPreferencesRequest(
        String preferredLocale,
        String preferredTheme
) {}
