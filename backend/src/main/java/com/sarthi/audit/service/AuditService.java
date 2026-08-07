package com.sarthi.audit.service;

import com.sarthi.audit.dto.AuditLogResponse;
import com.sarthi.audit.entity.AuditLog;
import com.sarthi.audit.repository.AuditLogRepository;
import com.sarthi.master.entity.AppUser;
import com.sarthi.master.repository.UserRepository;
import com.sarthi.master.service.CurrentUserService;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.Map;

@Service
public class AuditService {

    private static final Logger log = LoggerFactory.getLogger(AuditService.class);

    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;
    private final CurrentUserService currentUserService;
    private final TransactionTemplate requiresNewTx;

    public AuditService(AuditLogRepository auditLogRepository,
                        UserRepository userRepository,
                        CurrentUserService currentUserService,
                        PlatformTransactionManager transactionManager) {
        this.auditLogRepository = auditLogRepository;
        this.userRepository = userRepository;
        this.currentUserService = currentUserService;
        this.requiresNewTx = new TransactionTemplate(transactionManager);
        this.requiresNewTx.setPropagationBehavior(TransactionTemplate.PROPAGATION_REQUIRES_NEW);
    }

    /**
     * Best-effort audit write — never fails the business operation.
     * Uses TransactionTemplate so rollback of the audit TX cannot leak UnexpectedRollbackException.
     */
    public void record(String entityName, Long entityId, String action,
                       Map<String, Object> oldValue, Map<String, Object> newValue) {
        try {
            requiresNewTx.executeWithoutResult(status -> {
                AuditLog entry = new AuditLog();
                entry.setEntityName(entityName);
                entry.setEntityId(entityId != null ? entityId : 0L);
                entry.setAction(action);
                entry.setOldValue(oldValue != null ? oldValue : new HashMap<>());
                entry.setNewValue(newValue != null ? newValue : new HashMap<>());
                entry.setIpAddress(resolveClientIp());
                currentUserService.findCurrentUser().ifPresent(u -> entry.setChangedBy(u.getId()));
                auditLogRepository.saveAndFlush(entry);
            });
        } catch (Exception ex) {
            log.warn("Failed to write audit log for {}#{} {}: {}", entityName, entityId, action, ex.getMessage());
        }
    }

    /** Auth events may run without a SecurityContext (failed login). */
    public void recordAuth(String action, Long userId, String username, String ipAddress, Map<String, Object> details) {
        try {
            requiresNewTx.executeWithoutResult(status -> {
                AuditLog entry = new AuditLog();
                entry.setEntityName("User");
                entry.setEntityId(userId != null ? userId : 0L);
                entry.setAction(action);
                entry.setChangedBy(userId);
                entry.setIpAddress(ipAddress);
                Map<String, Object> payload = details != null ? new HashMap<>(details) : new HashMap<>();
                if (username != null) {
                    payload.put("username", username);
                }
                entry.setNewValue(payload);
                auditLogRepository.saveAndFlush(entry);
            });
        } catch (Exception ex) {
            log.warn("Failed to write auth audit {}: {}", action, ex.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public Page<AuditLogResponse> search(LocalDate from, LocalDate to, String entityName,
                                         String action, Long changedBy, int page, int size) {
        LocalDateTime fromTs = from != null ? from.atStartOfDay() : null;
        LocalDateTime toTs = to != null ? to.atTime(LocalTime.MAX) : null;
        int safeSize = Math.min(Math.max(size, 1), 100);
        int safePage = Math.max(page, 0);

        Page<AuditLog> result = auditLogRepository.search(
                fromTs, toTs,
                blankToNull(entityName), blankToNull(action), changedBy,
                PageRequest.of(safePage, safeSize));

        Map<Long, AppUser> cache = new HashMap<>();
        return result.map(a -> {
            String username = null;
            String fullName = null;
            if (a.getChangedBy() != null) {
                AppUser u = cache.computeIfAbsent(a.getChangedBy(),
                        id -> userRepository.findById(id).orElse(null));
                if (u != null) {
                    username = u.getUsername();
                    fullName = u.getFullName();
                }
            }
            return AuditLogResponse.from(a, username, fullName);
        });
    }

    public static Map<String, Object> mapOf(Object... keyValues) {
        Map<String, Object> map = new HashMap<>();
        for (int i = 0; i + 1 < keyValues.length; i += 2) {
            if (keyValues[i] != null) {
                map.put(String.valueOf(keyValues[i]), keyValues[i + 1]);
            }
        }
        return map;
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private String resolveClientIp() {
        try {
            ServletRequestAttributes attrs =
                    (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attrs == null) {
                return null;
            }
            return clientIp(attrs.getRequest());
        } catch (Exception ex) {
            return null;
        }
    }

    public static String clientIp(HttpServletRequest request) {
        if (request == null) {
            return null;
        }
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
