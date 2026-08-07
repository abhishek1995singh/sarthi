package com.sarthi.audit.dto;

import com.sarthi.audit.entity.AuditLog;

import java.time.LocalDateTime;
import java.util.Map;

public record AuditLogResponse(
        Long id,
        String entityName,
        Long entityId,
        String action,
        Long changedBy,
        String changedByUsername,
        String changedByFullName,
        LocalDateTime changedAt,
        Map<String, Object> oldValue,
        Map<String, Object> newValue,
        String ipAddress
) {
    public static AuditLogResponse from(AuditLog log, String username, String fullName) {
        return new AuditLogResponse(
                log.getId(),
                log.getEntityName(),
                log.getEntityId(),
                log.getAction(),
                log.getChangedBy(),
                username,
                fullName,
                log.getChangedAt(),
                log.getOldValue(),
                log.getNewValue(),
                log.getIpAddress()
        );
    }
}
