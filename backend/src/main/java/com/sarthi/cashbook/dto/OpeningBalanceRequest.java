package com.sarthi.cashbook.dto;

import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;

public record OpeningBalanceRequest(
        @NotNull(message = "Date is required")
        LocalDate date,

        @NotNull(message = "Opening balance is required")
        BigDecimal openingBalance
) {}
