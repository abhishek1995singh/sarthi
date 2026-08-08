package com.sarthi.ledger.controller;

import com.sarthi.common.response.ApiResponse;
import com.sarthi.ledger.dto.PartyLedgerSummaryResponse;
import com.sarthi.ledger.service.LedgerService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/ledger")
public class LedgerController {

    private final LedgerService ledgerService;

    public LedgerController(LedgerService ledgerService) {
        this.ledgerService = ledgerService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<PartyLedgerSummaryResponse>>> getAllSummaries() {
        return ResponseEntity.ok(ApiResponse.ok(ledgerService.getAllPartySummaries()));
    }

    @GetMapping("/parties/{partyId}")
    public ResponseEntity<ApiResponse<PartyLedgerSummaryResponse>> getPartyLedger(
            @PathVariable Long partyId,
            @RequestParam(required = false) Integer unpaidPage,
            @RequestParam(required = false) Integer unpaidSize,
            @RequestParam(required = false) Integer entryPage,
            @RequestParam(required = false) Integer entrySize) {
        return ResponseEntity.ok(ApiResponse.ok(
                ledgerService.getPartyLedger(partyId, unpaidPage, unpaidSize, entryPage, entrySize)));
    }

    @GetMapping("/parties/{partyId}/outstanding")
    public ResponseEntity<ApiResponse<Map<String, BigDecimal>>> getOutstanding(@PathVariable Long partyId) {
        BigDecimal outstanding = ledgerService.getPartyOutstanding(partyId);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("outstanding", outstanding)));
    }
}
