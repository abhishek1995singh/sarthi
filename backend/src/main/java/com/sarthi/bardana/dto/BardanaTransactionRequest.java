package com.sarthi.bardana.dto;

import com.sarthi.bardana.entity.BardanaTransaction;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;

public record BardanaTransactionRequest(
        @NotNull LocalDate transactionDate,
        @NotNull BardanaTransaction.Type type,
        @NotNull Long partyId,
        @NotNull Long commodityVarietyId,
        @NotNull Integer bags,
        BardanaTransaction.Mode mode,
        BigDecimal amount,
        Long linkedPurchaseId,
        Long linkedSaleId,
        String remarks
) {}
