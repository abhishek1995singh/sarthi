package com.sarthi.cashbook.controller;

import com.sarthi.cashbook.dto.CashBookDayResponse;
import com.sarthi.cashbook.dto.CashBookEntryRequest;
import com.sarthi.cashbook.dto.CashBookEntryResponse;
import com.sarthi.cashbook.dto.OpeningBalanceRequest;
import com.sarthi.cashbook.service.CashBookService;
import com.sarthi.common.response.ApiResponse;
import com.sarthi.common.response.PageResponse;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/cashbook")
public class CashBookController {

    private final CashBookService cashBookService;

    public CashBookController(CashBookService cashBookService) {
        this.cashBookService = cashBookService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<CashBookDayResponse>> getDay(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        LocalDate target = date != null ? date : LocalDate.now();
        return ResponseEntity.ok(ApiResponse.ok(cashBookService.getDay(target)));
    }

    @GetMapping("/entries")
    public ResponseEntity<ApiResponse<PageResponse<CashBookEntryResponse>>> getAllEntries(
            @RequestParam(required = false, defaultValue = "0") Integer page,
            @RequestParam(required = false, defaultValue = "20") Integer size,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate) {
        PageResponse<CashBookEntryResponse> entries = cashBookService.getAllEntries(page, size, fromDate, toDate);
        return ResponseEntity.ok(ApiResponse.ok(entries));
    }

    @PostMapping("/entries")
    public ResponseEntity<ApiResponse<CashBookEntryResponse>> createEntry(
            @Valid @RequestBody CashBookEntryRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        CashBookEntryResponse response = cashBookService.createEntry(request, userDetails.getUsername());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Cash book entry recorded and ledger posted", response));
    }

    @PostMapping("/opening-balance")
    public ResponseEntity<ApiResponse<CashBookDayResponse>> setOpeningBalance(
            @Valid @RequestBody OpeningBalanceRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Opening balance updated",
                cashBookService.setOpeningBalance(request)));
    }

    @PostMapping("/finalize")
    public ResponseEntity<ApiResponse<CashBookDayResponse>> finalizeDay(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Day finalized",
                cashBookService.finalizeDay(date)));
    }
}
