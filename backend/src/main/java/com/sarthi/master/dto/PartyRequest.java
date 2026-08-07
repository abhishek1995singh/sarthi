package com.sarthi.master.dto;

import com.sarthi.master.entity.Party;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record PartyRequest(
        @NotBlank(message = "Party name is required") String name,
        @NotNull(message = "Party type is required") Party.PartyType type,
        String contactPerson,
        String phone,
        String address,
        String gstin,
        BigDecimal openingBalance
) {}
