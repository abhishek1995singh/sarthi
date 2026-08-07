package com.sarthi.purchase.controller;

import com.sarthi.common.response.ApiResponse;
import com.sarthi.purchase.dto.PurchaseRequest;
import com.sarthi.purchase.dto.PurchaseResponse;
import com.sarthi.purchase.entity.Purchase;
import com.sarthi.purchase.service.PurchaseService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/purchase")
public class PurchaseController {

    private final PurchaseService purchaseService;

    public PurchaseController(PurchaseService purchaseService) {
        this.purchaseService = purchaseService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<PurchaseResponse>>> getAll() {
        List<PurchaseResponse> response = purchaseService.getAllPurchases().stream()
                .map(PurchaseResponse::from)
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<PurchaseResponse>> getById(@PathVariable Long id) {
        Purchase p = purchaseService.getPurchaseById(id);
        return ResponseEntity.ok(ApiResponse.ok(PurchaseResponse.from(p)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<PurchaseResponse>> create(
            @Valid @RequestBody PurchaseRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        Purchase p = purchaseService.createPurchase(request, userDetails.getUsername());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Purchase transaction recorded successfully", PurchaseResponse.from(p)));
    }

    @PostMapping("/{id}/confirm")
    public ResponseEntity<ApiResponse<PurchaseResponse>> confirm(@PathVariable Long id) {
        Purchase p = purchaseService.confirmPurchase(id);
        return ResponseEntity.ok(ApiResponse.ok("Purchase transaction confirmed and stock updated", PurchaseResponse.from(p)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        purchaseService.deletePurchase(id);
        return ResponseEntity.ok(ApiResponse.ok("Purchase transaction deleted successfully", null));
    }
}
