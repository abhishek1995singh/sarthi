package com.sarthi.report.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record CashFlowReportResponse(
        LocalDate from,
        LocalDate to,
        BigDecimal totalReceipts,
        BigDecimal totalPayments,
        BigDecimal netCash,
        List<CashFlowRow> entries
) {
    public record CashFlowRow(
            LocalDate date,
            String type,
            String partyName,
            BigDecimal amount,
            BigDecimal runningBalance,
            String remarks
    ) {}
}
