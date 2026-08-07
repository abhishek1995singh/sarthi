package com.sarthi.config.security;

import com.sarthi.audit.service.AuditService;
import com.sarthi.common.response.ApiResponse;
import com.sarthi.master.entity.AppUser;
import com.sarthi.master.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthenticationManager authManager;
    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;
    private final UserRepository userRepository;
    private final AuditService auditService;

    public AuthController(AuthenticationManager authManager, JwtService jwtService,
                          UserDetailsService userDetailsService, UserRepository userRepository,
                          AuditService auditService) {
        this.authManager = authManager;
        this.jwtService = jwtService;
        this.userDetailsService = userDetailsService;
        this.userRepository = userRepository;
        this.auditService = auditService;
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<Map<String, Object>>> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest) {
        String ip = AuditService.clientIp(httpRequest);
        try {
            authManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.username(), request.password()));
        } catch (BadCredentialsException | DisabledException ex) {
            Long userId = userRepository.findByUsername(request.username())
                    .map(AppUser::getId).orElse(null);
            auditService.recordAuth("LOGIN_FAILED", userId, request.username(), ip,
                    AuditService.mapOf("reason", ex.getClass().getSimpleName()));
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Invalid username or password"));
        }

        UserDetails userDetails = userDetailsService.loadUserByUsername(request.username());
        String token = jwtService.generateToken(userDetails);
        AppUser user = userRepository.findByUsername(request.username()).orElseThrow();
        auditService.recordAuth("LOGIN", user.getId(), user.getUsername(), ip, null);

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("token", token);
        payload.put("id", user.getId());
        payload.put("username", user.getUsername());
        payload.put("fullName", user.getFullName());
        payload.put("role", user.getRole());
        payload.put("preferredLocale", user.getPreferredLocale());
        payload.put("preferredTheme", user.getPreferredTheme());
        return ResponseEntity.ok(ApiResponse.ok(payload));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(
            @AuthenticationPrincipal UserDetails userDetails,
            HttpServletRequest httpRequest) {
        if (userDetails != null) {
            userRepository.findByUsername(userDetails.getUsername()).ifPresent(user ->
                    auditService.recordAuth("LOGOUT", user.getId(), user.getUsername(),
                            AuditService.clientIp(httpRequest), null));
        }
        return ResponseEntity.ok(ApiResponse.ok("Signed out", null));
    }

    public record LoginRequest(
            @NotBlank String username,
            @NotBlank String password
    ) {}
}
