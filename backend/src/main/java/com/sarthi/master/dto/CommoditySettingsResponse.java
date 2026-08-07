package com.sarthi.master.dto;

import com.sarthi.master.entity.CommoditySettings;
import java.math.BigDecimal;
import java.util.List;

public record CommoditySettingsResponse(
        Long id,
        Long commodityVarietyId,
        String varietyName,
        BigDecimal gausharaRate,
        BigDecimal commissionRate,
        List<BigDecimal> allowedCashDiscounts,
        CommoditySettings.BardanaMode bardanaMode,
        BigDecimal bagWeightKg,
        BigDecimal saleTaxRate,
        CommoditySettings.LabourRateBasis labourRateBasis,
        BigDecimal labourRate
) {
    public static CommoditySettingsResponse from(CommoditySettings s) {
        return new CommoditySettingsResponse(
                s.getId(),
                s.getCommodityVariety().getId(),
                s.getCommodityVariety().getName(),
                s.getGausharaRate(),
                s.getCommissionRate(),
                s.getAllowedCashDiscountList(),
                s.getBardanaMode(),
                s.getBagWeightKg(),
                s.getSaleTaxRate(),
                s.getLabourRateBasis(),
                s.getLabourRate()
        );
    }
}
