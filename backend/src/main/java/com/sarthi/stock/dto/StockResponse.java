package com.sarthi.stock.dto;

import com.sarthi.stock.entity.Stock;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public record StockResponse(
        Long id,
        Long commodityVarietyId,
        String commodityVarietyName,
        String commodityName,
        BigDecimal quantityQuintals,
        Integer bags,
        LocalDateTime lastUpdated
) {
    public static StockResponse from(Stock s) {
        return new StockResponse(
                s.getId(),
                s.getCommodityVariety().getId(),
                s.getCommodityVariety().getName(),
                s.getCommodityVariety().getCommodity().getName(),
                s.getQuantityQuintals(),
                s.getBags(),
                s.getLastUpdated()
        );
    }
}
