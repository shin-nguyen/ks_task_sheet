package dev.kstasks.auth;

import dev.kstasks.auth.dto.UpdateRoleRequest;
import dev.kstasks.auth.dto.UserResponse;
import dev.kstasks.common.ApiException;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    private final UserRepository userRepository;

    public UserController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping
    public List<UserResponse> list() {
        return userRepository.findAllByOrderByNameAsc().stream().map(UserResponse::from).toList();
    }

    @PatchMapping("/{id}/role")
    public UserResponse updateRole(@PathVariable UUID id, @Valid @RequestBody UpdateRoleRequest req) {
        User target = userRepository.findById(id).orElseThrow(() -> ApiException.notFound("User not found"));
        boolean demotingLastAdmin = target.getRole() == User.Role.ADMIN
                && req.role() != User.Role.ADMIN
                && userRepository.countByRole(User.Role.ADMIN) <= 1;
        if (demotingLastAdmin) {
            throw ApiException.badRequest("LAST_ADMIN", "Cannot remove the last remaining admin");
        }
        target.setRole(req.role());
        return UserResponse.from(userRepository.save(target));
    }
}
