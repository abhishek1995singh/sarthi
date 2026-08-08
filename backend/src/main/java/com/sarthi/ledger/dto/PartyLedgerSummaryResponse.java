package com.sarthi.ledger.dto;

import com.sarthi.common.response.PageResponse;

import java.math.BigDecimal;

public record PartyLedgerSummaryResponse(
        Long partyId,
        String partyName,
        String partyType,
        BigDecimal openingBalance,
        BigDecimal purchaseOutstanding,
        BigDecimal totalOutstanding,
        PageResponse<UnpaidPurchaseSummary> unpaidPurchases,
        PageResponse<LedgerEntryResponse> entries
) {
    public record UnpaidPurchaseSummary(
            Long purchaseId,
            String purchaseDate,
            String commodityVarietyName,
            BigDecimal netPayable,
            BigDecimal amountPaid,
            BigDecimal outstanding,
            String paymentStatus
    ) {}
}
