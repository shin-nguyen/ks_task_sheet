package dev.kstasks.notify;

import dev.kstasks.auth.CurrentUser;
import dev.kstasks.common.ApiException;
import dev.kstasks.epic.Epic;
import dev.kstasks.epic.EpicRepository;
import dev.kstasks.notify.client.RocketChatClient;
import dev.kstasks.notify.dto.GlobalSettingsResponse;
import dev.kstasks.notify.dto.NotifyConfigRequest;
import dev.kstasks.notify.dto.NotifyConfigResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
@Transactional
public class NotifyConfigService {

    private final EpicNotifyConfigRepository configRepository;
    private final EpicNotifyStateRepository stateRepository;
    private final EpicRepository epicRepository;
    private final NotifyGlobalSettingsRepository globalSettingsRepository;
    private final RocketChatClient rocketChatClient;

    public NotifyConfigService(EpicNotifyConfigRepository configRepository, EpicNotifyStateRepository stateRepository,
                                EpicRepository epicRepository, NotifyGlobalSettingsRepository globalSettingsRepository,
                                RocketChatClient rocketChatClient) {
        this.configRepository = configRepository;
        this.stateRepository = stateRepository;
        this.epicRepository = epicRepository;
        this.globalSettingsRepository = globalSettingsRepository;
        this.rocketChatClient = rocketChatClient;
    }

    public NotifyConfigResponse get(UUID epicId) {
        return configRepository.findByEpicId(epicId)
                .map(config -> NotifyConfigResponse.from(config, stateRepository.findById(epicId).orElse(null)))
                .orElseGet(NotifyConfigResponse::unconfigured);
    }

    public NotifyConfigResponse save(UUID epicId, NotifyConfigRequest req) {
        Epic epic = epicRepository.findById(epicId).orElseThrow(() -> ApiException.notFound("Epic not found"));
        boolean anyEnabled = req.meetingReminderEnabled() || req.dailyReportEnabled() || req.mergeNotifyEnabled();
        String roomName = req.roomName() != null ? req.roomName().trim() : "";

        if (anyEnabled && roomName.isEmpty()) {
            throw ApiException.badRequest("ROOM_REQUIRED", "A chat room name is required to enable any notification type");
        }
        if (req.mergeNotifyEnabled()) {
            if (req.gitRepoUrl() == null || !(req.gitRepoUrl().startsWith("http://") || req.gitRepoUrl().startsWith("https://"))) {
                throw ApiException.badRequest("GIT_REPO_URL_INVALID", "Git repo URL must be an http(s):// URL");
            }
            if (req.gitBranch() == null || req.gitBranch().isBlank()) {
                throw ApiException.badRequest("GIT_BRANCH_REQUIRED", "Git branch is required when merge notifications are enabled");
            }
            if (req.gitPollIntervalMinutes() < 1) {
                throw ApiException.badRequest("GIT_POLL_INTERVAL_INVALID", "Git poll interval must be at least 1 minute");
            }
        }

        EpicNotifyConfig config = configRepository.findByEpicId(epicId).orElse(null);
        boolean isNew = config == null;
        if (isNew) {
            config = new EpicNotifyConfig();
            config.setEpic(epic);
        }

        boolean roomChanged = isNew || !roomName.equals(config.getRoomName());
        if (anyEnabled && roomChanged) {
            RocketChatClient.Room room = rocketChatClient.findRoomByName(roomName)
                    .orElseThrow(() -> ApiException.badRequest("ROOM_NOT_FOUND", "No Rocket.Chat room found matching '" + roomName + "'"));
            config.setRoomId(room._id());
            config.setRoomResolvedAt(Instant.now());
        }

        config.setRoomName(roomName);
        config.setMeetingReminderEnabled(req.meetingReminderEnabled());
        config.setDailyReportEnabled(req.dailyReportEnabled());
        config.setDailyReportTime(req.dailyReportTime());
        config.setMergeNotifyEnabled(req.mergeNotifyEnabled());
        config.setGitRepoUrl(req.gitRepoUrl());
        config.setGitBranch(req.gitBranch());
        config.setGitPollIntervalMinutes(req.gitPollIntervalMinutes());
        config.setUpdatedBy(CurrentUser.get());
        config = configRepository.save(config);

        if (isNew) {
            EpicNotifyState state = new EpicNotifyState();
            state.setEpicId(epicId);
            stateRepository.save(state);
        }

        return NotifyConfigResponse.from(config, stateRepository.findById(epicId).orElse(null));
    }

    public NotifyConfigResponse reresolveRoom(UUID epicId) {
        EpicNotifyConfig config = configRepository.findByEpicId(epicId)
                .orElseThrow(() -> ApiException.notFound("This epic has no notify configuration yet"));
        RocketChatClient.Room room = rocketChatClient.findRoomByName(config.getRoomName())
                .orElseThrow(() -> ApiException.badRequest("ROOM_NOT_FOUND", "No Rocket.Chat room found matching '" + config.getRoomName() + "'"));
        config.setRoomId(room._id());
        config.setRoomResolvedAt(Instant.now());
        EpicNotifyConfig saved = configRepository.save(config);
        return NotifyConfigResponse.from(saved, stateRepository.findById(epicId).orElse(null));
    }

    public GlobalSettingsResponse getGlobalSettings() {
        return GlobalSettingsResponse.from(loadGlobalSettings());
    }

    public GlobalSettingsResponse setGlobalSettings(boolean enabled) {
        NotifyGlobalSettings settings = loadGlobalSettings();
        settings.setEnabled(enabled);
        settings.setUpdatedBy(CurrentUser.get());
        return GlobalSettingsResponse.from(globalSettingsRepository.save(settings));
    }

    private NotifyGlobalSettings loadGlobalSettings() {
        return globalSettingsRepository.findById((short) 1).orElseThrow(() -> new IllegalStateException("notify_global_settings row is missing"));
    }
}
