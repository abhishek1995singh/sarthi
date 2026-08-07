package com.sarthi.cashbook.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;

public record CashBookEntryRequest(
        @NotNull(message = "Entry date is required")
        LocalDate entryDate,

        @NotNull(message = "Entry type is required")
        String type,

        Long partyId,

        Long linkedPurchaseId,

        Long linkedSaleId,

        @NotNull(message = "Amount is required")
        @DecimalMin(value = "0.01", message = "Amount must be greater than zero")
        BigDecimal amount,

        String remarks
) {}
