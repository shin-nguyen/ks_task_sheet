package dev.kstasks.meeting;

import dev.kstasks.auth.CurrentUser;
import dev.kstasks.common.ApiException;
import dev.kstasks.epic.Epic;
import dev.kstasks.epic.EpicAccessService;
import dev.kstasks.epic.EpicRepository;
import dev.kstasks.meeting.dto.MeetingRequest;
import dev.kstasks.meeting.dto.MeetingResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@Transactional
public class MeetingController {

    private final EpicMeetingRepository meetingRepository;
    private final EpicRepository epicRepository;
    private final EpicAccessService epicAccessService;

    public MeetingController(EpicMeetingRepository meetingRepository, EpicRepository epicRepository, EpicAccessService epicAccessService) {
        this.meetingRepository = meetingRepository;
        this.epicRepository = epicRepository;
        this.epicAccessService = epicAccessService;
    }

    @GetMapping("/epics/{epicId}/meetings")
    public List<MeetingResponse> list(@PathVariable UUID epicId) {
        epicAccessService.assertAccess(epicId);
        return meetingRepository.findAllByEpicIdOrderByScheduledAtAsc(epicId).stream().map(MeetingResponse::from).toList();
    }

    @PostMapping("/epics/{epicId}/meetings")
    public ResponseEntity<MeetingResponse> create(@PathVariable UUID epicId, @Valid @RequestBody MeetingRequest req) {
        epicAccessService.assertAccess(epicId);
        Epic epic = epicRepository.findById(epicId).orElseThrow(() -> ApiException.notFound("Epic not found"));
        EpicMeeting meeting = new EpicMeeting();
        meeting.setEpic(epic);
        applyFields(meeting, req);
        meeting.setCreatedBy(CurrentUser.get());
        meeting = meetingRepository.save(meeting);
        return ResponseEntity.status(HttpStatus.CREATED).body(MeetingResponse.from(meeting));
    }

    @PutMapping("/meetings/{id}")
    public MeetingResponse update(@PathVariable UUID id, @Valid @RequestBody MeetingRequest req) {
        EpicMeeting meeting = getAccessibleOrThrow(id);
        applyFields(meeting, req);
        return MeetingResponse.from(meetingRepository.save(meeting));
    }

    @DeleteMapping("/meetings/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        EpicMeeting meeting = getAccessibleOrThrow(id);
        meetingRepository.delete(meeting);
        return ResponseEntity.noContent().build();
    }

    private void applyFields(EpicMeeting meeting, MeetingRequest req) {
        meeting.setTitle(req.title().trim());
        meeting.setScheduledAt(req.scheduledAt());
        meeting.setLink(req.link());
        meeting.setAgenda(req.agenda());
        meeting.setMinutes(req.minutes());
    }

    private EpicMeeting getAccessibleOrThrow(UUID id) {
        EpicMeeting meeting = meetingRepository.findById(id).orElseThrow(() -> ApiException.notFound("Meeting not found"));
        epicAccessService.assertAccess(meeting.getEpic().getId());
        return meeting;
    }
}
