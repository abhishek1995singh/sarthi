package com.sarthi.master.dto;

import com.sarthi.master.entity.Party;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public record PartyResponse(
        Long id,
        String name,
        Party.PartyType type,
        String contactPerson,
        String phone,
        String address,
        String gstin,
        BigDecimal openingBalance,
        boolean active,
        LocalDateTime createdAt
) {
    public static PartyResponse from(Party party) {
        return new PartyResponse(
                party.getId(), party.getName(), party.getType(),
                party.getContactPerson(), party.getPhone(), party.getAddress(),
                party.getGstin(), party.getOpeningBalance(), party.isActive(),
                party.getCreatedAt()
        );
    }
}
