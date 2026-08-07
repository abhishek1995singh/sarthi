package com.sarthi.bardana.dto;

public record BardanaBalanceResponse(
        Long partyId,
        String partyName,
        Long commodityVarietyId,
        String commodityVarietyName,
        String commodityName,
        Integer balanceBags
) {}
