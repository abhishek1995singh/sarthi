package com.sarthi.stock.service;

import com.sarthi.common.exception.ResourceNotFoundException;
import com.sarthi.master.entity.CommodityVariety;
import com.sarthi.master.repository.CommodityVarietyRepository;
import com.sarthi.stock.entity.Stock;
import com.sarthi.stock.repository.StockRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class StockService {

    private final StockRepository stockRepository;
    private final CommodityVarietyRepository commodityVarietyRepository;

    public StockService(StockRepository stockRepository,
                        CommodityVarietyRepository commodityVarietyRepository) {
        this.stockRepository = stockRepository;
        this.commodityVarietyRepository = commodityVarietyRepository;
    }

    @Transactional(readOnly = true)
    public List<Stock> getAllStock() {
        return stockRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Stock getStockByVariety(Long varietyId) {
        return stockRepository.findByCommodityVarietyId(varietyId)
                .orElseThrow(() -> new ResourceNotFoundException("Stock not found for variety ID: " + varietyId));
    }

    @Transactional
    public void incrementStock(Long varietyId, BigDecimal weight, Integer bags) {
        Stock stock = stockRepository.findByCommodityVarietyId(varietyId)
                .orElseGet(() -> {
                    CommodityVariety cv = commodityVarietyRepository.findById(varietyId)
                            .orElseThrow(() -> new ResourceNotFoundException("Commodity variety not found with ID: " + varietyId));
                    Stock s = new Stock();
                    s.setCommodityVariety(cv);
                    s.setQuantityQuintals(BigDecimal.ZERO);
                    s.setBags(0);
                    return s;
                });

        stock.setQuantityQuintals(stock.getQuantityQuintals().add(weight));
        stock.setBags(stock.getBags() + bags);
        stock.setLastUpdated(LocalDateTime.now());
        stockRepository.save(stock);
    }

    @Transactional
    public void decrementStock(Long varietyId, BigDecimal weight, Integer bags) {
        Stock stock = stockRepository.findByCommodityVarietyId(varietyId)
                .orElseThrow(() -> new ResourceNotFoundException("Stock entry not found for variety ID: " + varietyId));

        if (stock.getQuantityQuintals().compareTo(weight) < 0) {
            throw new IllegalArgumentException("Insufficient stock quantity! Available: " + stock.getQuantityQuintals() + ", Requested: " + weight);
        }
        if (stock.getBags() < bags) {
            throw new IllegalArgumentException("Insufficient stock bags! Available: " + stock.getBags() + ", Requested: " + bags);
        }

        stock.setQuantityQuintals(stock.getQuantityQuintals().subtract(weight));
        stock.setBags(stock.getBags() - bags);
        stock.setLastUpdated(LocalDateTime.now());
        stockRepository.save(stock);
    }
}
