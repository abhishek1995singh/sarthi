package com.sarthi.purchase.dto;

import com.sarthi.purchase.entity.Purchase;
import java.math.BigDecimal;
import java.time.LocalDate;

public record PurchaseResponse(
        Long id,
        LocalDate purchaseDate,
        Long partyId,
        String partyName,
        Long commodityVarietyId,
        String commodityVarietyName,
        String commodityName,
        BigDecimal weightQuintals,
        Integer bags,
        BigDecimal ratePerQuintal,
        BigDecimal grossAmount,
        BigDecimal gaushalaRate,
        BigDecimal gaushalaAmount,
        BigDecimal commissionRate,
        BigDecimal commissionAmount,
        BigDecimal cashDiscountPct,
        BigDecimal cashDiscountAmount,
        BigDecimal netPayable,
        BigDecimal amountPaid,
        Purchase.PaymentStatus paymentStatus,
        boolean confirmed,
        String remarks,
        String createdByFullName
) {
    public static PurchaseResponse from(Purchase p) {
        return new PurchaseResponse(
                p.getId(),
                p.getPurchaseDate(),
                p.getParty().getId(),
                p.getParty().getName(),
                p.getCommodityVariety().getId(),
                p.getCommodityVariety().getName(),
                p.getCommodityVariety().getCommodity().getName(),
                p.getWeightQuintals(),
                p.getBags(),
                p.getRatePerQuintal(),
                p.getGrossAmount(),
                p.getGaushalaRate(),
                p.getGaushalaAmount(),
                p.getCommissionRate(),
                p.getCommissionAmount(),
                p.getCashDiscountPct(),
                p.getCashDiscountAmount(),
                p.getNetPayable(),
                p.getAmountPaid(),
                p.getPaymentStatus(),
                p.isConfirmed(),
                p.getRemarks(),
                p.getCreatedBy() != null ? p.getCreatedBy().getFullName() : "System"
        );
    }
}
