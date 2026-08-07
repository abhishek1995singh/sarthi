package com.sarthi.report.controller;

import com.sarthi.bardana.dto.BardanaBalanceResponse;
import com.sarthi.common.response.ApiResponse;
import com.sarthi.ledger.dto.PartyLedgerSummaryResponse;
import com.sarthi.report.dto.CashFlowReportResponse;
import com.sarthi.report.dto.PurchaseSaleReportResponse;
import com.sarthi.report.service.ReportService;
import com.sarthi.stock.dto.StockResponse;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/reports")
public class ReportController {

    private final ReportService reportService;

    public ReportController(ReportService reportService) {
        this.reportService = reportService;
    }

    @GetMapping("/cash-flow")
    public ResponseEntity<ApiResponse<CashFlowReportResponse>> cashFlow(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.ok(reportService.cashFlow(from, to)));
    }

    @GetMapping("/purchase-sale")
    public ResponseEntity<ApiResponse<PurchaseSaleReportResponse>> purchaseSale(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.ok(reportService.purchaseSale(from, to)));
    }

    @GetMapping("/stock")
    public ResponseEntity<ApiResponse<List<StockResponse>>> stock() {
        return ResponseEntity.ok(ApiResponse.ok(reportService.stock()));
    }

    @GetMapping("/bardana-balance")
    public ResponseEntity<ApiResponse<List<BardanaBalanceResponse>>> bardanaBalance(
            @RequestParam(required = false) Long partyId) {
        return ResponseEntity.ok(ApiResponse.ok(reportService.bardanaBalances(partyId)));
    }

    @GetMapping("/ledger/{partyId}")
    public ResponseEntity<ApiResponse<PartyLedgerSummaryResponse>> ledger(@PathVariable Long partyId) {
        return ResponseEntity.ok(ApiResponse.ok(reportService.partyLedger(partyId)));
    }
}
