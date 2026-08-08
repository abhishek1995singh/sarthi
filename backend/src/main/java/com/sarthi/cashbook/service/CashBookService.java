package com.sarthi.cashbook.service;

import com.sarthi.audit.service.AuditService;
import com.sarthi.cashbook.dto.CashBookDayResponse;
import com.sarthi.cashbook.dto.CashBookEntryRequest;
import com.sarthi.cashbook.dto.CashBookEntryResponse;
import com.sarthi.cashbook.dto.OpeningBalanceRequest;
import com.sarthi.cashbook.entity.CashBookEntry;
import com.sarthi.cashbook.entity.DailyCashBalance;
import com.sarthi.cashbook.repository.CashBookEntryRepository;
import com.sarthi.common.exception.BusinessValidationException;
import com.sarthi.common.response.PageResponse;
import com.sarthi.ledger.service.LedgerPostingService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class CashBookService {

    private static final int MAX_PAGE_SIZE = 100;
    private static final int DEFAULT_PAGE_SIZE = 20;

    private final CashBookEntryRepository cashBookEntryRepository;
    private final LedgerPostingService ledgerPostingService;
    private final AuditService auditService;

    public CashBookService(CashBookEntryRepository cashBookEntryRepository,
                           LedgerPostingService ledgerPostingService,
                           AuditService auditService) {
        this.cashBookEntryRepository = cashBookEntryRepository;
        this.ledgerPostingService = ledgerPostingService;
        this.auditService = auditService;
    }

    @Transactional
    public CashBookDayResponse getDay(LocalDate date) {
        DailyCashBalance balance = ledgerPostingService.ensureDailyBalance(date);
        List<CashBookEntryResponse> entries = cashBookEntryRepository.findByEntryDateOrderByIdAsc(date)
                .stream()
                .map(CashBookEntryResponse::from)
                .collect(Collectors.toList());
        return CashBookDayResponse.of(balance, entries);
    }

    @Transactional
    public CashBookEntryResponse createEntry(CashBookEntryRequest request, String username) {
        CashBookEntry.EntryType type;
        try {
            type = CashBookEntry.EntryType.valueOf(request.type().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new BusinessValidationException("Invalid entry type. Use RECEIPT or PAYMENT.");
        }

        if (type == CashBookEntry.EntryType.OPENING_BALANCE) {
            throw new BusinessValidationException("Use POST /cashbook/opening-balance for opening balance.");
        }

        CashBookEntry entry = ledgerPostingService.postEntry(
                request.entryDate(),
                type,
                request.partyId(),
                request.linkedPurchaseId(),
                request.linkedSaleId(),
                request.amount(),
                request.remarks(),
                username
        );
        CashBookEntryResponse response = CashBookEntryResponse.from(entry);
        auditService.record("CashBook", entry.getId(), "CREATE", null,
                AuditService.mapOf(
                        "type", response.type(),
                        "amount", response.amount(),
                        "party", response.partyName(),
                        "entryDate", response.entryDate() != null ? response.entryDate().toString() : null
                ));
        return response;
    }

    @Transactional
    public CashBookDayResponse setOpeningBalance(OpeningBalanceRequest request) {
        DailyCashBalance balance = ledgerPostingService.setOpeningBalance(
                request.date(), request.openingBalance());
        auditService.record("CashBook", balance.getId(), "UPDATE", null,
                AuditService.mapOf(
                        "kind", "OPENING_BALANCE",
                        "date", request.date().toString(),
                        "openingBalance", request.openingBalance()
                ));
        List<CashBookEntryResponse> entries = cashBookEntryRepository
                .findByEntryDateOrderByIdAsc(request.date())
                .stream()
                .map(CashBookEntryResponse::from)
                .collect(Collectors.toList());
        return CashBookDayResponse.of(balance, entries);
    }

    @Transactional
    public CashBookDayResponse finalizeDay(LocalDate date) {
        DailyCashBalance balance = ledgerPostingService.finalizeDay(date);
        auditService.record("CashBook", balance.getId(), "UPDATE", null,
                AuditService.mapOf("kind", "FINALIZE_DAY", "date", date.toString(), "finalized", true));
        List<CashBookEntryResponse> entries = cashBookEntryRepository.findByEntryDateOrderByIdAsc(date)
                .stream()
                .map(CashBookEntryResponse::from)
                .collect(Collectors.toList());
        return CashBookDayResponse.of(balance, entries);
    }

    @Transactional(readOnly = true)
    public PageResponse<CashBookEntryResponse> getAllEntries(Integer page, Integer size, LocalDate fromDate, LocalDate toDate) {
        int safePage = page != null ? Math.max(page, 0) : 0;
        int safeSize = size != null ? Math.min(Math.max(size, 1), MAX_PAGE_SIZE) : DEFAULT_PAGE_SIZE;

        Pageable pageable = PageRequest.of(safePage, safeSize);
        Page<CashBookEntry> result;

        if (fromDate != null && toDate != null) {
            result = cashBookEntryRepository.findByEntryDateBetweenOrderByEntryDateDescIdDesc(fromDate, toDate, pageable);
        } else {
            result = cashBookEntryRepository.findByOrderByEntryDateDescIdDesc(pageable);
        }

        Page<CashBookEntryResponse> responsePage = result.map(CashBookEntryResponse::from);
        return PageResponse.from(responsePage);
    }
}
