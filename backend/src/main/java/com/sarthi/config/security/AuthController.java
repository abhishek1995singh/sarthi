package com.sarthi.config.security;

import com.sarthi.common.response.ApiResponse;
import com.sarthi.master.entity.AppUser;
import com.sarthi.master.repository.UserRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthenticationManager authManager;
    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;
    private final UserRepository userRepository;

    public AuthController(AuthenticationManager authManager, JwtService jwtService,
                          UserDetailsService userDetailsService, UserRepository userRepository) {
        this.authManager = authManager;
        this.jwtService = jwtService;
        this.userDetailsService = userDetailsService;
        this.userRepository = userRepository;
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<Map<String, Object>>> login(
            @Valid @RequestBody LoginRequest request) {
        authManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.username(), request.password()));
        UserDetails userDetails = userDetailsService.loadUserByUsername(request.username());
        String token = jwtService.generateToken(userDetails);
        AppUser user = userRepository.findByUsername(request.username()).orElseThrow();
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "token", token,
                "username", user.getUsername(),
                "fullName", user.getFullName(),
                "role", user.getRole()
        )));
    }

    public record LoginRequest(
            @NotBlank String username,
            @NotBlank String password
    ) {}
}
