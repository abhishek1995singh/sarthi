package com.sarthi.ledger.dto;

import com.sarthi.ledger.entity.PartyLedgerEntry;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record LedgerEntryResponse(
        Long id,
        Long partyId,
        String partyName,
        LocalDate entryDate,
        Long cashBookEntryId,
        String cashBookType,
        Long purchaseId,
        Long saleId,
        Long commodityVarietyId,
        String commodityVarietyName,
        BigDecimal amountPaid,
        BigDecimal outstandingBalanceAfter,
        String narration,
        LocalDateTime createdAt
) {
    public static LedgerEntryResponse from(PartyLedgerEntry e) {
        return new LedgerEntryResponse(
                e.getId(),
                e.getParty().getId(),
                e.getParty().getName(),
                e.getEntryDate(),
                e.getCashBookEntry().getId(),
                e.getCashBookEntry().getType().name(),
                e.getPurchase() != null ? e.getPurchase().getId() : null,
                e.getSaleId(),
                e.getCommodityVariety() != null ? e.getCommodityVariety().getId() : null,
                e.getCommodityVariety() != null ? e.getCommodityVariety().getName() : null,
                e.getAmountPaid(),
                e.getOutstandingBalanceAfter(),
                e.getNarration(),
                e.getCreatedAt()
        );
    }
}
