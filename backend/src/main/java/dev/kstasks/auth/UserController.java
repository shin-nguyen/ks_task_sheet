package dev.kstasks.auth;

import dev.kstasks.auth.dto.AdminResetPasswordRequest;
import dev.kstasks.auth.dto.UpdateRoleRequest;
import dev.kstasks.auth.dto.UserResponse;
import dev.kstasks.common.ApiException;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserController(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
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

    @PatchMapping("/{id}/password")
    public ResponseEntity<Void> resetPassword(@PathVariable UUID id, @Valid @RequestBody AdminResetPasswordRequest req) {
        User target = userRepository.findById(id).orElseThrow(() -> ApiException.notFound("User not found"));
        target.setPassword(passwordEncoder.encode(req.newPassword()));
        target.setMustChangePassword(true);
        userRepository.save(target);
        return ResponseEntity.noContent().build();
    }
}
