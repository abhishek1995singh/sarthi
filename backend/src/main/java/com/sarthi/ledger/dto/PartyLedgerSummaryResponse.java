package com.sarthi.ledger.dto;

import java.math.BigDecimal;
import java.util.List;

public record PartyLedgerSummaryResponse(
        Long partyId,
        String partyName,
        String partyType,
        BigDecimal openingBalance,
        BigDecimal purchaseOutstanding,
        BigDecimal totalOutstanding,
        List<UnpaidPurchaseSummary> unpaidPurchases,
        List<LedgerEntryResponse> entries
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
