package com.sarthi.sale.controller;

import com.sarthi.common.response.ApiResponse;
import com.sarthi.sale.dto.SaleRequest;
import com.sarthi.sale.dto.SaleResponse;
import com.sarthi.sale.entity.Sale;
import com.sarthi.sale.service.SaleService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/sale")
public class SaleController {

    private final SaleService saleService;

    public SaleController(SaleService saleService) {
        this.saleService = saleService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<SaleResponse>>> getAll() {
        List<SaleResponse> response = saleService.getAllSales().stream()
                .map(SaleResponse::from)
                .toList();
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<SaleResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(SaleResponse.from(saleService.getSaleById(id))));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<SaleResponse>> create(
            @Valid @RequestBody SaleRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        Sale sale = saleService.createSale(request, userDetails.getUsername());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Sale recorded", SaleResponse.from(sale)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<SaleResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody SaleRequest request) {
        Sale sale = saleService.updateSale(id, request);
        return ResponseEntity.ok(ApiResponse.ok("Sale draft updated", SaleResponse.from(sale)));
    }

    @PostMapping("/{id}/confirm")
    public ResponseEntity<ApiResponse<SaleResponse>> confirm(@PathVariable Long id) {
        Sale sale = saleService.confirmSale(id);
        return ResponseEntity.ok(ApiResponse.ok("Sale confirmed and stock reduced", SaleResponse.from(sale)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        saleService.deleteSale(id);
        return ResponseEntity.ok(ApiResponse.ok("Sale draft deleted", null));
    }
}
