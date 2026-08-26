package dev.kstasks.notify.dto;

import dev.kstasks.notify.NotifyGlobalSettings;

public record GlobalSettingsResponse(boolean enabled) {
    public static GlobalSettingsResponse from(NotifyGlobalSettings settings) {
        return new GlobalSettingsResponse(settings.isEnabled());
    }
}
