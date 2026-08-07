package com.sarthi.sale.dto;

import com.sarthi.sale.entity.Sale;

import java.math.BigDecimal;
import java.time.LocalDate;

public record SaleResponse(
        Long id,
        LocalDate saleDate,
        Sale.SaleType saleType,
        Long buyerId,
        String buyerName,
        Long commodityId,
        Long commodityVarietyId,
        String commodityVarietyName,
        String commodityName,
        BigDecimal quantityQuintals,
        BigDecimal ratePerQuintal,
        Integer bags,
        Long transporterId,
        String transporterName,
        BigDecimal transportCharge,
        BigDecimal labourCharge,
        BigDecimal commissionAmount,
        BigDecimal taxAmount,
        BigDecimal totalAmount,
        String fobDetails,
        BigDecimal amountReceived,
        Sale.PaymentStatus paymentStatus,
        boolean confirmed,
        String remarks,
        String createdByFullName
) {
    public static SaleResponse from(Sale s) {
        return new SaleResponse(
                s.getId(),
                s.getSaleDate(),
                s.getSaleType(),
                s.getBuyer().getId(),
                s.getBuyer().getName(),
                s.getCommodityVariety().getCommodity().getId(),
                s.getCommodityVariety().getId(),
                s.getCommodityVariety().getName(),
                s.getCommodityVariety().getCommodity().getName(),
                s.getQuantityQuintals(),
                s.getRatePerQuintal(),
                s.getBags(),
                s.getTransporter() != null ? s.getTransporter().getId() : null,
                s.getTransporter() != null ? s.getTransporter().getName() : null,
                s.getTransportCharge(),
                s.getLabourCharge(),
                s.getCommissionAmount(),
                s.getTaxAmount(),
                s.getTotalAmount(),
                s.getFobDetails(),
                s.getAmountReceived(),
                s.getPaymentStatus(),
                s.isConfirmed(),
                s.getRemarks(),
                s.getCreatedBy() != null ? s.getCreatedBy().getFullName() : "System"
        );
    }
}
