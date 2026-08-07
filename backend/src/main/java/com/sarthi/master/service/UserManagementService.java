package com.sarthi.master.service;

import com.sarthi.audit.service.AuditService;
import com.sarthi.common.exception.BusinessValidationException;
import com.sarthi.common.exception.ResourceNotFoundException;
import com.sarthi.master.dto.*;
import com.sarthi.master.entity.AppUser;
import com.sarthi.master.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;

@Service
@Transactional(readOnly = true)
public class UserManagementService {

    private static final Set<String> ALLOWED_ROLES = Set.of("OWNER", "STAFF");
    private static final Set<String> ALLOWED_LOCALES = Set.of("en", "hi");
    private static final Set<String> ALLOWED_THEMES = Set.of(
            "harvest", "forest", "ocean", "slate", "clay", "midnight");

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final CurrentUserService currentUserService;
    private final AuditService auditService;

    public UserManagementService(UserRepository userRepository,
                                 PasswordEncoder passwordEncoder,
                                 CurrentUserService currentUserService,
                                 AuditService auditService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.currentUserService = currentUserService;
        this.auditService = auditService;
    }

    public List<UserResponse> listUsers() {
        return userRepository.findAll().stream().map(UserResponse::from).toList();
    }

    public UserResponse getById(Long id) {
        return UserResponse.from(findOrThrow(id));
    }

    @Transactional(readOnly = false)
    public UserResponse create(CreateUserRequest request) {
        String role = normalizeRole(request.role());
        if (userRepository.existsByUsername(request.username().trim())) {
            throw new BusinessValidationException("Username already exists: " + request.username());
        }
        AppUser user = new AppUser();
        user.setUsername(request.username().trim());
        user.setFullName(request.fullName().trim());
        user.setRole(role);
        user.setPassword(passwordEncoder.encode(request.password()));
        user.setActive(true);
        user.setPreferredLocale("en");
        user.setPreferredTheme("harvest");
        AppUser saved = userRepository.saveAndFlush(user);
        auditService.record("User", saved.getId(), "CREATE", null,
                AuditService.mapOf("username", saved.getUsername(), "fullName", saved.getFullName(), "role", saved.getRole()));
        return UserResponse.from(saved);
    }

    @Transactional
    public UserResponse update(Long id, UpdateUserRequest request) {
        AppUser user = findOrThrow(id);
        String role = normalizeRole(request.role());
        if ("OWNER".equals(user.getRole()) && !"OWNER".equals(role) && user.isActive()) {
            ensureAnotherActiveOwner(user.getId());
        }
        var old = AuditService.mapOf("fullName", user.getFullName(), "role", user.getRole());
        user.setFullName(request.fullName().trim());
        user.setRole(role);
        AppUser saved = userRepository.save(user);
        auditService.record("User", saved.getId(), "UPDATE", old,
                AuditService.mapOf("fullName", saved.getFullName(), "role", saved.getRole()));
        return UserResponse.from(saved);
    }

    @Transactional
    public UserResponse disable(Long id) {
        AppUser actor = currentUserService.requireCurrentUser();
        AppUser user = findOrThrow(id);
        if (actor.getId().equals(user.getId())) {
            throw new BusinessValidationException("You cannot disable your own account.");
        }
        if ("OWNER".equals(user.getRole()) && user.isActive()) {
            ensureAnotherActiveOwner(user.getId());
        }
        user.setActive(false);
        AppUser saved = userRepository.save(user);
        auditService.record("User", saved.getId(), "DISABLE",
                AuditService.mapOf("active", true),
                AuditService.mapOf("active", false, "username", saved.getUsername()));
        return UserResponse.from(saved);
    }

    @Transactional
    public UserResponse enable(Long id) {
        AppUser user = findOrThrow(id);
        user.setActive(true);
        AppUser saved = userRepository.save(user);
        auditService.record("User", saved.getId(), "ENABLE",
                AuditService.mapOf("active", false),
                AuditService.mapOf("active", true, "username", saved.getUsername()));
        return UserResponse.from(saved);
    }

    @Transactional
    public void resetPassword(Long id, ResetPasswordRequest request) {
        AppUser user = findOrThrow(id);
        user.setPassword(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
        auditService.record("User", user.getId(), "PASSWORD_RESET", null,
                AuditService.mapOf("username", user.getUsername()));
    }

    @Transactional
    public UserPreferencesResponse updatePreferences(UserPreferencesRequest request) {
        AppUser user = currentUserService.requireCurrentUser();
        String locale = request.preferredLocale() != null ? request.preferredLocale().trim() : user.getPreferredLocale();
        String theme = request.preferredTheme() != null ? request.preferredTheme().trim() : user.getPreferredTheme();
        if (!ALLOWED_LOCALES.contains(locale)) {
            throw new BusinessValidationException("Unsupported locale. Use en or hi.");
        }
        if (!ALLOWED_THEMES.contains(theme)) {
            throw new BusinessValidationException("Unsupported theme.");
        }
        user.setPreferredLocale(locale);
        user.setPreferredTheme(theme);
        return UserPreferencesResponse.from(userRepository.save(user));
    }

    public UserPreferencesResponse getPreferences() {
        return UserPreferencesResponse.from(currentUserService.requireCurrentUser());
    }

    private void ensureAnotherActiveOwner(Long excludingId) {
        long owners = userRepository.findAll().stream()
                .filter(u -> u.isActive() && "OWNER".equals(u.getRole()) && !u.getId().equals(excludingId))
                .count();
        if (owners < 1) {
            throw new BusinessValidationException("At least one active OWNER is required.");
        }
    }

    private AppUser findOrThrow(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", id));
    }

    private String normalizeRole(String role) {
        if (role == null) {
            throw new BusinessValidationException("Role is required.");
        }
        String normalized = role.trim().toUpperCase();
        if (!ALLOWED_ROLES.contains(normalized)) {
            throw new BusinessValidationException("Role must be OWNER or STAFF.");
        }
        return normalized;
    }
}
