package com.sarthi.sale.dto;

import com.sarthi.sale.entity.Sale;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;

public record SaleRequest(
        @NotNull(message = "Sale date is required")
        LocalDate saleDate,

        @NotNull(message = "Sale type is required")
        Sale.SaleType saleType,

        @NotNull(message = "Buyer is required")
        Long buyerId,

        @NotNull(message = "Commodity variety is required")
        Long commodityVarietyId,

        @NotNull(message = "Quantity is required")
        @DecimalMin(value = "0.001", message = "Quantity must be greater than zero")
        BigDecimal quantityQuintals,

        @DecimalMin(value = "0.01", message = "Rate must be greater than zero")
        BigDecimal ratePerQuintal,

        @Min(value = 0, message = "Bags cannot be negative")
        Integer bags,

        Long transporterId,

        String transportNumber,

        @DecimalMin(value = "0.00", message = "Transport charge cannot be negative")
        BigDecimal transportCharge,

        @DecimalMin(value = "0.00", message = "Labour charge cannot be negative")
        BigDecimal labourCharge,

        /** Required for FOB when rate is not provided. */
        @DecimalMin(value = "0.01", message = "Total amount must be greater than zero")
        BigDecimal totalAmount,

        String fobDetails,

        String remarks
) {}
