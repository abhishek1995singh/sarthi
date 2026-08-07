package com.sarthi.cashbook.service;

import com.sarthi.cashbook.dto.CashBookDayResponse;
import com.sarthi.cashbook.dto.CashBookEntryRequest;
import com.sarthi.cashbook.dto.CashBookEntryResponse;
import com.sarthi.cashbook.dto.OpeningBalanceRequest;
import com.sarthi.cashbook.entity.CashBookEntry;
import com.sarthi.cashbook.entity.DailyCashBalance;
import com.sarthi.cashbook.repository.CashBookEntryRepository;
import com.sarthi.common.exception.BusinessValidationException;
import com.sarthi.ledger.service.LedgerPostingService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class CashBookService {

    private final CashBookEntryRepository cashBookEntryRepository;
    private final LedgerPostingService ledgerPostingService;

    public CashBookService(CashBookEntryRepository cashBookEntryRepository,
                           LedgerPostingService ledgerPostingService) {
        this.cashBookEntryRepository = cashBookEntryRepository;
        this.ledgerPostingService = ledgerPostingService;
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
        return CashBookEntryResponse.from(entry);
    }

    @Transactional
    public CashBookDayResponse setOpeningBalance(OpeningBalanceRequest request) {
        DailyCashBalance balance = ledgerPostingService.setOpeningBalance(
                request.date(), request.openingBalance());
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
        List<CashBookEntryResponse> entries = cashBookEntryRepository.findByEntryDateOrderByIdAsc(date)
                .stream()
                .map(CashBookEntryResponse::from)
                .collect(Collectors.toList());
        return CashBookDayResponse.of(balance, entries);
    }
}
