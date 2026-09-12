package com.sarthi.ledger.service;

import com.sarthi.common.exception.ResourceNotFoundException;
import com.sarthi.common.response.PageResponse;
import com.sarthi.ledger.dto.LedgerEntryResponse;
import com.sarthi.ledger.dto.PartyLedgerSummaryResponse;
import com.sarthi.ledger.repository.PartyLedgerEntryRepository;
import com.sarthi.master.entity.Party;
import com.sarthi.master.repository.PartyRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
public class LedgerService {

    private static final int MAX_PAGE_SIZE = 100;

    private final PartyLedgerEntryRepository partyLedgerEntryRepository;
    private final PartyRepository partyRepository;
    private final LedgerPostingService ledgerPostingService;

    public LedgerService(PartyLedgerEntryRepository partyLedgerEntryRepository,
                         PartyRepository partyRepository,
                         LedgerPostingService ledgerPostingService) {
        this.partyLedgerEntryRepository = partyLedgerEntryRepository;
        this.partyRepository = partyRepository;
        this.ledgerPostingService = ledgerPostingService;
    }

    @Transactional(readOnly = true)
    public PartyLedgerSummaryResponse getPartyLedger(Long partyId) {
        return getPartyLedger(partyId, null, null);
    }

    @Transactional(readOnly = true)
    public PartyLedgerSummaryResponse getPartyLedger(Long partyId, Integer entryPage, Integer entrySize) {
        Party party = partyRepository.findById(partyId)
                .orElseThrow(() -> new ResourceNotFoundException("Party not found with ID: " + partyId));

        BigDecimal totalOutstanding = ledgerPostingService.computePartyOutstanding(partyId);

        return new PartyLedgerSummaryResponse(
                party.getId(),
                party.getName(),
                party.getType().name(),
                party.getOpeningBalance(),
                BigDecimal.ZERO,
                totalOutstanding,
                loadEntries(partyId, entryPage, entrySize)
        );
    }

    private PageResponse<LedgerEntryResponse> loadEntries(Long partyId, Integer page, Integer size) {
        if (page == null || size == null) {
            List<LedgerEntryResponse> all = partyLedgerEntryRepository
                    .findByPartyIdOrderByEntryDateAscIdAsc(partyId)
                    .stream()
                    .map(LedgerEntryResponse::from)
                    .toList();
            return PageResponse.of(all);
        }

        Pageable pageable = PageRequest.of(safePage(page), safeSize(size));
        Page<LedgerEntryResponse> result = partyLedgerEntryRepository
                .findByPartyIdOrderByEntryDateDescIdDesc(partyId, pageable)
                .map(LedgerEntryResponse::from);
        return PageResponse.from(result);
    }

    private int safePage(int page) {
        return Math.max(page, 0);
    }

    private int safeSize(int size) {
        return Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
    }

    @Transactional(readOnly = true)
    public BigDecimal getPartyOutstanding(Long partyId) {
        return ledgerPostingService.computePartyOutstanding(partyId);
    }

    @Transactional(readOnly = true)
    public List<PartyLedgerSummaryResponse> getAllPartySummaries() {
        return partyRepository.findByActiveTrue().stream()
                .map(p -> {
                    BigDecimal outstanding = ledgerPostingService.computePartyOutstanding(p.getId());
                    return new PartyLedgerSummaryResponse(
                            p.getId(),
                            p.getName(),
                            p.getType().name(),
                            p.getOpeningBalance(),
                            BigDecimal.ZERO,
                            outstanding,
                            PageResponse.empty()
                    );
                })
                .filter(s -> s.totalOutstanding().compareTo(BigDecimal.ZERO) != 0)
                .toList();
    }
}
