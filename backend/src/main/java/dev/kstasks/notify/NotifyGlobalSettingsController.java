package dev.kstasks.notify;

import dev.kstasks.notify.dto.GlobalSettingsRequest;
import dev.kstasks.notify.dto.GlobalSettingsResponse;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/notify/global-settings")
public class NotifyGlobalSettingsController {

    private final NotifyConfigService notifyConfigService;

    public NotifyGlobalSettingsController(NotifyConfigService notifyConfigService) {
        this.notifyConfigService = notifyConfigService;
    }

    @GetMapping
    public GlobalSettingsResponse get() {
        return notifyConfigService.getGlobalSettings();
    }

    @PutMapping
    public GlobalSettingsResponse save(@Valid @RequestBody GlobalSettingsRequest req) {
        return notifyConfigService.setGlobalSettings(req.enabled());
    }
}
