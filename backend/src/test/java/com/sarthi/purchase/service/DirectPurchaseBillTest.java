package com.sarthi.purchase.service;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;

class DirectPurchaseBillTest {

    @Test
    void addsGaushalaAndCommissionThenSubtractsCashDiscount() {
        BigDecimal net = DirectPurchaseBill.netPayable(
                new BigDecimal("10000.00"),
                new BigDecimal("200.00"),
                new BigDecimal("150.00"),
                new BigDecimal("10.00"));

        assertEquals(new BigDecimal("10340.00"), net);
    }

    @Test
    void withNoExtrasEqualsGross() {
        BigDecimal gross = new BigDecimal("5000.00");
        BigDecimal net = DirectPurchaseBill.netPayable(
                gross, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO);

        assertEquals(new BigDecimal("5000.00"), net);
    }
}
