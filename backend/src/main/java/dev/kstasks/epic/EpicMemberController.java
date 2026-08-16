package dev.kstasks.epic;

import dev.kstasks.auth.User;
import dev.kstasks.auth.UserRepository;
import dev.kstasks.common.ApiException;
import dev.kstasks.epic.dto.AddEpicMemberRequest;
import dev.kstasks.epic.dto.EpicMemberResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/epics/{epicId}/members")
@Transactional
public class EpicMemberController {

    private final EpicMemberRepository epicMemberRepository;
    private final EpicRepository epicRepository;
    private final UserRepository userRepository;
    private final EpicAccessService epicAccessService;

    public EpicMemberController(EpicMemberRepository epicMemberRepository, EpicRepository epicRepository,
                                 UserRepository userRepository, EpicAccessService epicAccessService) {
        this.epicMemberRepository = epicMemberRepository;
        this.epicRepository = epicRepository;
        this.userRepository = userRepository;
        this.epicAccessService = epicAccessService;
    }

    @GetMapping
    public List<EpicMemberResponse> list(@PathVariable UUID epicId) {
        epicAccessService.assertAccess(epicId);
        return epicMemberRepository.findAllByEpicIdOrderByAddedAtAsc(epicId).stream()
                .map(EpicMemberResponse::from)
                .toList();
    }

    @PostMapping
    public ResponseEntity<EpicMemberResponse> add(@PathVariable UUID epicId, @Valid @RequestBody AddEpicMemberRequest req) {
        Epic epic = epicRepository.findById(epicId).orElseThrow(() -> ApiException.notFound("Epic not found"));
        User user = userRepository.findById(req.userId()).orElseThrow(() -> ApiException.notFound("User not found"));
        if (epicMemberRepository.existsByEpicIdAndUserId(epicId, user.getId())) {
            throw ApiException.conflict("ALREADY_MEMBER", "This user is already a member of the epic");
        }
        EpicMember member = new EpicMember();
        member.setEpic(epic);
        member.setUser(user);
        member = epicMemberRepository.save(member);
        return ResponseEntity.status(HttpStatus.CREATED).body(EpicMemberResponse.from(member));
    }

    @DeleteMapping("/{userId}")
    public ResponseEntity<Void> remove(@PathVariable UUID epicId, @PathVariable UUID userId) {
        epicMemberRepository.deleteByEpicIdAndUserId(epicId, userId);
        return ResponseEntity.noContent().build();
    }
}
