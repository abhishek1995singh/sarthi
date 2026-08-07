package com.sarthi.audit.repository;

import com.sarthi.audit.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    @Query("""
            SELECT a FROM AuditLog a
            WHERE (:from IS NULL OR a.changedAt >= :from)
              AND (:to IS NULL OR a.changedAt <= :to)
              AND (:entityName IS NULL OR a.entityName = :entityName)
              AND (:action IS NULL OR a.action = :action)
              AND (:changedBy IS NULL OR a.changedBy = :changedBy)
            ORDER BY a.changedAt DESC, a.id DESC
            """)
    Page<AuditLog> search(
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to,
            @Param("entityName") String entityName,
            @Param("action") String action,
            @Param("changedBy") Long changedBy,
            Pageable pageable);
}
