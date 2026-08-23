package dev.kstasks.auth;

import dev.kstasks.auth.dto.AuthUserResponse;
import dev.kstasks.auth.dto.ChangePasswordRequest;
import dev.kstasks.auth.dto.LoginRequest;
import dev.kstasks.auth.dto.SignupRequest;
import dev.kstasks.common.ApiException;
import dev.kstasks.config.CookieUtil;
import dev.kstasks.config.JwtService;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final CookieUtil cookieUtil;

    public AuthController(UserRepository userRepository, PasswordEncoder passwordEncoder,
                           JwtService jwtService, CookieUtil cookieUtil) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.cookieUtil = cookieUtil;
    }

    @PostMapping("/signup")
    public ResponseEntity<AuthUserResponse> signup(@Valid @RequestBody SignupRequest req, HttpServletResponse response) {
        if (userRepository.existsByEmailIgnoreCase(req.email())) {
            throw ApiException.conflict("EMAIL_TAKEN", "An account with this email already exists");
        }
        User user = new User();
        user.setEmail(req.email().trim().toLowerCase());
        user.setName(req.name().trim());
        user.setPassword(passwordEncoder.encode(req.password()));
        user.setRole(userRepository.count() == 0 ? User.Role.ADMIN : User.Role.MEMBER);
        user = userRepository.save(user);

        String token = jwtService.generateToken(user.getId(), user.getEmail());
        cookieUtil.setAuthCookie(response, token);
        return ResponseEntity.status(HttpStatus.CREATED).body(AuthUserResponse.from(user));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthUserResponse> login(@Valid @RequestBody LoginRequest req, HttpServletResponse response) {
        User user = userRepository.findByEmailIgnoreCase(req.email())
                .orElseThrow(() -> ApiException.unauthorized("Invalid email or password"));
        if (!passwordEncoder.matches(req.password(), user.getPassword())) {
            throw ApiException.unauthorized("Invalid email or password");
        }
        String token = jwtService.generateToken(user.getId(), user.getEmail());
        cookieUtil.setAuthCookie(response, token);
        return ResponseEntity.ok(AuthUserResponse.from(user));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletResponse response) {
        cookieUtil.clearAuthCookie(response);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me")
    public ResponseEntity<AuthUserResponse> me() {
        return ResponseEntity.ok(AuthUserResponse.from(CurrentUser.get()));
    }

    @PatchMapping("/password")
    public ResponseEntity<Void> changePassword(@Valid @RequestBody ChangePasswordRequest req) {
        User user = userRepository.findById(CurrentUser.get().getId())
                .orElseThrow(() -> ApiException.unauthorized("Not authenticated"));
        if (!passwordEncoder.matches(req.currentPassword(), user.getPassword())) {
            throw ApiException.badRequest("INVALID_PASSWORD", "Current password is incorrect");
        }
        user.setPassword(passwordEncoder.encode(req.newPassword()));
        user.setMustChangePassword(false);
        userRepository.save(user);
        return ResponseEntity.noContent().build();
    }
}
