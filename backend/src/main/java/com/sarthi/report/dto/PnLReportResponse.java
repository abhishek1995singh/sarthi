package com.sarthi.report.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record PnLReportResponse(
        LocalDate from,
        LocalDate to,
        BigDecimal totalIncome,
        BigDecimal totalCost,
        BigDecimal netProfit,
        List<PnLBucket> buckets
) {
    public record PnLBucket(
            String label,
            LocalDate periodStart,
            LocalDate periodEnd,
            BigDecimal income,
            BigDecimal cost,
            BigDecimal profit
    ) {}
}
