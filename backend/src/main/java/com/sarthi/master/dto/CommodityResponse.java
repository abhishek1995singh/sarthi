package com.sarthi.master.dto;

import com.sarthi.master.entity.Commodity;
import com.sarthi.master.entity.CommodityVariety;

import java.time.LocalDateTime;
import java.util.List;

public record CommodityResponse(
        Long id,
        String name,
        boolean hasVarieties,
        boolean active,
        LocalDateTime createdAt,
        List<CommodityVarietyResponse> varieties
) {
    public static CommodityResponse from(Commodity commodity, List<CommodityVariety> varieties) {
        List<CommodityVarietyResponse> varietyResponses = varieties == null
                ? List.of()
                : varieties.stream().map(CommodityVarietyResponse::from).toList();
        return new CommodityResponse(
                commodity.getId(),
                commodity.getName(),
                commodity.isHasVarieties(),
                commodity.isActive(),
                commodity.getCreatedAt(),
                varietyResponses
        );
    }

    public static CommodityResponse from(Commodity commodity) {
        return from(commodity, commodity.getVarieties());
    }
}
