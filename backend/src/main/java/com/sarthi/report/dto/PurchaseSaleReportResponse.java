package com.sarthi.report.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record PurchaseSaleReportResponse(
        LocalDate from,
        LocalDate to,
        BigDecimal totalPurchaseNet,
        BigDecimal totalSaleAmount,
        List<PurchaseRow> purchases,
        List<SaleRow> sales
) {
    public record PurchaseRow(
            Long id,
            LocalDate date,
            String partyName,
            String commodity,
            String variety,
            BigDecimal weightQuintals,
            Integer bags,
            BigDecimal netPayable,
            String paymentStatus,
            boolean confirmed
    ) {}

    public record SaleRow(
            Long id,
            LocalDate date,
            String buyerName,
            String commodity,
            String variety,
            BigDecimal quantityQuintals,
            Integer bags,
            BigDecimal totalAmount,
            String paymentStatus,
            boolean confirmed
    ) {}
}
