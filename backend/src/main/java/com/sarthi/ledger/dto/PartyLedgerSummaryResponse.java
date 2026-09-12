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
        PageResponse<LedgerEntryResponse> entries
) {}
