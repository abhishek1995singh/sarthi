package com.sarthi.master.service;

import com.sarthi.common.exception.ResourceNotFoundException;
import com.sarthi.master.entity.AppUser;
import com.sarthi.master.repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class CurrentUserService {

    private final UserRepository userRepository;

    public CurrentUserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public Optional<AppUser> findCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth.getPrincipal() == null) {
            return Optional.empty();
        }
        String username = auth.getName();
        if (username == null || username.isBlank() || "anonymousUser".equals(username)) {
            return Optional.empty();
        }
        return userRepository.findByUsername(username);
    }

    public AppUser requireCurrentUser() {
        return findCurrentUser()
                .orElseThrow(() -> new ResourceNotFoundException("Current user not found"));
    }
}
