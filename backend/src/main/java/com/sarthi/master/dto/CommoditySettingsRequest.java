package com.sarthi.master.dto;

import com.sarthi.master.entity.CommoditySettings;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record CommoditySettingsRequest(
        @NotNull BigDecimal gausharaRate,
        @NotNull @DecimalMin("0") BigDecimal commissionRate,
        @NotBlank String allowedCashDiscounts,
        @NotNull CommoditySettings.BardanaMode bardanaMode,
        @NotNull @DecimalMin("1") BigDecimal bagWeightKg,
        @NotNull @DecimalMin("0") BigDecimal saleTaxRate,
        @NotNull CommoditySettings.LabourRateBasis labourRateBasis,
        @NotNull @DecimalMin("0") BigDecimal labourRate
) {}
