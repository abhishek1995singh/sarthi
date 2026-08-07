package com.sarthi.bardana.controller;

import com.sarthi.bardana.dto.BardanaBalanceResponse;
import com.sarthi.bardana.dto.BardanaTransactionRequest;
import com.sarthi.bardana.dto.BardanaTransactionResponse;
import com.sarthi.bardana.entity.BardanaTransaction;
import com.sarthi.bardana.service.BardanaService;
import com.sarthi.common.response.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/bardana")
public class BardanaController {

    private final BardanaService bardanaService;

    public BardanaController(BardanaService bardanaService) {
        this.bardanaService = bardanaService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<BardanaTransactionResponse>>> list(
            @RequestParam(required = false) Long partyId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        List<BardanaTransactionResponse> data = bardanaService.list(partyId, from, to).stream()
                .map(BardanaTransactionResponse::from)
                .toList();
        return ResponseEntity.ok(ApiResponse.ok(data));
    }

    @GetMapping("/balances")
    public ResponseEntity<ApiResponse<List<BardanaBalanceResponse>>> balances(
            @RequestParam(required = false) Long partyId) {
        return ResponseEntity.ok(ApiResponse.ok(bardanaService.balances(partyId)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<BardanaTransactionResponse>> create(
            @Valid @RequestBody BardanaTransactionRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        BardanaTransaction tx = bardanaService.create(request, userDetails.getUsername());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Bardana entry recorded", BardanaTransactionResponse.from(tx)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        bardanaService.delete(id);
        return ResponseEntity.ok(ApiResponse.ok("Bardana entry deleted", null));
    }
}
