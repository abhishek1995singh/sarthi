package com.sarthi.master.dto;

import com.sarthi.master.entity.CommodityVariety;

import java.time.LocalDateTime;

public record CommodityVarietyResponse(
        Long id,
        Long commodityId,
        String name,
        boolean active,
        LocalDateTime createdAt
) {
    public static CommodityVarietyResponse from(CommodityVariety variety) {
        return new CommodityVarietyResponse(
                variety.getId(),
                variety.getCommodity() != null ? variety.getCommodity().getId() : null,
                variety.getName(),
                variety.isActive(),
                variety.getCreatedAt()
        );
    }
}
