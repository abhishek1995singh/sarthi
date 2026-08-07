package com.sarthi.cashbook.dto;

import com.sarthi.cashbook.entity.CashBookEntry;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record CashBookEntryResponse(
        Long id,
        LocalDate entryDate,
        String type,
        Long partyId,
        String partyName,
        Long linkedPurchaseId,
        Long linkedSaleId,
        BigDecimal amount,
        BigDecimal runningBalance,
        String remarks,
        String createdByFullName,
        LocalDateTime createdAt
) {
    public static CashBookEntryResponse from(CashBookEntry e) {
        return new CashBookEntryResponse(
                e.getId(),
                e.getEntryDate(),
                e.getType().name(),
                e.getParty() != null ? e.getParty().getId() : null,
                e.getParty() != null ? e.getParty().getName() : null,
                e.getLinkedPurchase() != null ? e.getLinkedPurchase().getId() : null,
                e.getLinkedSaleId(),
                e.getAmount(),
                e.getRunningBalance(),
                e.getRemarks(),
                e.getCreatedBy() != null ? e.getCreatedBy().getFullName() : "System",
                e.getCreatedAt()
        );
    }
}
