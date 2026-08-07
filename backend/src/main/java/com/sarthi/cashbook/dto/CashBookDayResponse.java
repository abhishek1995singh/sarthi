package com.sarthi.cashbook.dto;

import com.sarthi.cashbook.entity.DailyCashBalance;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record CashBookDayResponse(
        LocalDate date,
        BigDecimal openingBalance,
        BigDecimal totalReceipts,
        BigDecimal totalPayments,
        BigDecimal closingBalance,
        boolean finalized,
        List<CashBookEntryResponse> entries
) {
    public static CashBookDayResponse of(DailyCashBalance balance, List<CashBookEntryResponse> entries) {
        return new CashBookDayResponse(
                balance.getBalanceDate(),
                balance.getOpeningBalance(),
                balance.getTotalReceipts(),
                balance.getTotalPayments(),
                balance.getClosingBalance(),
                balance.isFinalized(),
                entries
        );
    }
}
