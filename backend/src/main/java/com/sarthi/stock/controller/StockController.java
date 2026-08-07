package com.sarthi.stock.controller;

import com.sarthi.common.response.ApiResponse;
import com.sarthi.stock.dto.StockResponse;
import com.sarthi.stock.service.StockService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/stock")
public class StockController {

    private final StockService stockService;

    public StockController(StockService stockService) {
        this.stockService = stockService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<StockResponse>>> getAll() {
        List<StockResponse> response = stockService.getAllStock().stream()
                .map(StockResponse::from)
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/variety/{varietyId}")
    public ResponseEntity<ApiResponse<StockResponse>> getByVariety(@PathVariable Long varietyId) {
        return ResponseEntity.ok(ApiResponse.ok(StockResponse.from(stockService.getStockByVariety(varietyId))));
    }
}
