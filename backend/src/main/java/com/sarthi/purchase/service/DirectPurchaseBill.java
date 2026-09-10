package com.sarthi.purchase.service;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Direct purchase net: gaushala and commission are costs added to gross.
 * Cash discount is the only deduction.
 */
final class DirectPurchaseBill {

    private DirectPurchaseBill() {}

    static BigDecimal netPayable(
            BigDecimal grossAmount,
            BigDecimal gaushalaAmount,
            BigDecimal commissionAmount,
            BigDecimal cashDiscountAmount) {
        return grossAmount
                .add(gaushalaAmount)
                .add(commissionAmount)
                .subtract(cashDiscountAmount)
                .setScale(2, RoundingMode.HALF_UP);
    }
}
