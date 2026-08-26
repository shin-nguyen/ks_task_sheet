package dev.kstasks.notify;

import dev.kstasks.epic.EpicAccessService;
import dev.kstasks.notify.dto.NotifyConfigRequest;
import dev.kstasks.notify.dto.NotifyConfigResponse;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/epics/{epicId}/notify-config")
public class NotifyConfigController {

    private final NotifyConfigService notifyConfigService;
    private final EpicAccessService epicAccessService;

    public NotifyConfigController(NotifyConfigService notifyConfigService, EpicAccessService epicAccessService) {
        this.notifyConfigService = notifyConfigService;
        this.epicAccessService = epicAccessService;
    }

    @GetMapping
    public NotifyConfigResponse get(@PathVariable UUID epicId) {
        epicAccessService.assertAccess(epicId);
        return notifyConfigService.get(epicId);
    }

    @PutMapping
    public NotifyConfigResponse save(@PathVariable UUID epicId, @Valid @RequestBody NotifyConfigRequest req) {
        epicAccessService.assertAccess(epicId);
        return notifyConfigService.save(epicId, req);
    }

    @PostMapping("/reresolve-room")
    public NotifyConfigResponse reresolveRoom(@PathVariable UUID epicId) {
        epicAccessService.assertAccess(epicId);
        return notifyConfigService.reresolveRoom(epicId);
    }
}
