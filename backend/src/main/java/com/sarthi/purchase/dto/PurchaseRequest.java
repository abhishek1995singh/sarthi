package com.sarthi.purchase.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;

public record PurchaseRequest(
        @NotNull(message = "Purchase date is required")
        LocalDate purchaseDate,

        @NotNull(message = "Party ID is required")
        Long partyId,

        @NotNull(message = "Commodity variety ID is required")
        Long commodityVarietyId,

        @NotNull(message = "Weight is required")
        @DecimalMin(value = "0.001", message = "Weight must be greater than zero")
        BigDecimal weightQuintals,

        @Min(value = 0, message = "Bags count cannot be negative")
        Integer bags,

        @NotNull(message = "Rate per quintal is required")
        @DecimalMin(value = "0.01", message = "Rate must be greater than zero")
        BigDecimal ratePerQuintal,

        BigDecimal cashDiscountPct,

        String remarks
) {}
