package com.sarthi.bardana.dto;

import com.sarthi.bardana.entity.BardanaTransaction;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

public record BardanaTransactionResponse(
        Long id,
        LocalDate transactionDate,
        String type,
        Long partyId,
        String partyName,
        Long commodityVarietyId,
        String commodityVarietyName,
        String commodityName,
        Integer bags,
        String mode,
        BigDecimal amount,
        Long linkedPurchaseId,
        Long linkedSaleId,
        String remarks,
        String createdByFullName,
        Instant createdAt
) {
    public static BardanaTransactionResponse from(BardanaTransaction t) {
        var variety = t.getCommodityVariety();
        var commodity = variety != null ? variety.getCommodity() : null;
        return new BardanaTransactionResponse(
                t.getId(),
                t.getTransactionDate(),
                t.getType().name(),
                t.getParty() != null ? t.getParty().getId() : null,
                t.getParty() != null ? t.getParty().getName() : null,
                variety != null ? variety.getId() : null,
                variety != null ? variety.getName() : null,
                commodity != null ? commodity.getName() : null,
                t.getBags(),
                t.getMode().name(),
                t.getAmount(),
                t.getLinkedPurchase() != null ? t.getLinkedPurchase().getId() : null,
                t.getLinkedSale() != null ? t.getLinkedSale().getId() : null,
                t.getRemarks(),
                t.getCreatedBy() != null ? t.getCreatedBy().getFullName() : null,
                t.getCreatedAt()
        );
    }
}
