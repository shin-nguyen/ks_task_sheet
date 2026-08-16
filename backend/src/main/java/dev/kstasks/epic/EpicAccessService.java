package dev.kstasks.epic;

import dev.kstasks.auth.CurrentUser;
import dev.kstasks.auth.User;
import dev.kstasks.common.ApiException;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class EpicAccessService {

    private final EpicMemberRepository epicMemberRepository;

    public EpicAccessService(EpicMemberRepository epicMemberRepository) {
        this.epicMemberRepository = epicMemberRepository;
    }

    public void assertAccess(UUID epicId) {
        User user = CurrentUser.get();
        if (user.getRole() == User.Role.ADMIN) {
            return;
        }
        if (!epicMemberRepository.existsByEpicIdAndUserId(epicId, user.getId())) {
            throw ApiException.forbidden("You don't have access to this epic");
        }
    }
}
