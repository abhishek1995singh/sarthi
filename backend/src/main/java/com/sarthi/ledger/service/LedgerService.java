package com.sarthi.ledger.service;

import com.sarthi.common.exception.ResourceNotFoundException;
import com.sarthi.common.response.PageResponse;
import com.sarthi.ledger.dto.LedgerEntryResponse;
import com.sarthi.ledger.dto.PartyLedgerSummaryResponse;
import com.sarthi.ledger.repository.PartyLedgerEntryRepository;
import com.sarthi.master.entity.Party;
import com.sarthi.master.repository.PartyRepository;
import com.sarthi.purchase.entity.Purchase;
import com.sarthi.purchase.repository.PurchaseRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class LedgerService {

    private static final int MAX_PAGE_SIZE = 100;

    private final PartyLedgerEntryRepository partyLedgerEntryRepository;
    private final PartyRepository partyRepository;
    private final PurchaseRepository purchaseRepository;
    private final LedgerPostingService ledgerPostingService;

    public LedgerService(PartyLedgerEntryRepository partyLedgerEntryRepository,
                         PartyRepository partyRepository,
                         PurchaseRepository purchaseRepository,
                         LedgerPostingService ledgerPostingService) {
        this.partyLedgerEntryRepository = partyLedgerEntryRepository;
        this.partyRepository = partyRepository;
        this.purchaseRepository = purchaseRepository;
        this.ledgerPostingService = ledgerPostingService;
    }

    @Transactional(readOnly = true)
    public PartyLedgerSummaryResponse getPartyLedger(Long partyId) {
        return getPartyLedger(partyId, null, null, null, null);
    }

    @Transactional(readOnly = true)
    public PartyLedgerSummaryResponse getPartyLedger(Long partyId,
                                                     Integer unpaidPage,
                                                     Integer unpaidSize,
                                                     Integer entryPage,
                                                     Integer entrySize) {
        Party party = partyRepository.findById(partyId)
                .orElseThrow(() -> new ResourceNotFoundException("Party not found with ID: " + partyId));

        BigDecimal purchaseOutstanding = purchaseRepository.sumOutstandingByPartyId(partyId);
        if (purchaseOutstanding == null) {
            purchaseOutstanding = BigDecimal.ZERO;
        }
        BigDecimal totalOutstanding = ledgerPostingService.computePartyOutstanding(partyId);

        PageResponse<PartyLedgerSummaryResponse.UnpaidPurchaseSummary> unpaid =
                loadUnpaidPurchases(partyId, unpaidPage, unpaidSize);
        PageResponse<LedgerEntryResponse> entries =
                loadEntries(partyId, entryPage, entrySize);

        return new PartyLedgerSummaryResponse(
                party.getId(),
                party.getName(),
                party.getType().name(),
                party.getOpeningBalance(),
                purchaseOutstanding,
                totalOutstanding,
                unpaid,
                entries
        );
    }

    private PageResponse<PartyLedgerSummaryResponse.UnpaidPurchaseSummary> loadUnpaidPurchases(
            Long partyId, Integer page, Integer size) {
        if (page == null || size == null) {
            List<PartyLedgerSummaryResponse.UnpaidPurchaseSummary> all = purchaseRepository
                    .findByParty_IdAndPaymentStatusNotOrderByPurchaseDateDescIdDesc(
                            partyId, Purchase.PaymentStatus.PAID, Pageable.unpaged())
                    .stream()
                    .map(this::toUnpaidSummary)
                    .collect(Collectors.toList());
            return PageResponse.of(all);
        }

        Pageable pageable = PageRequest.of(safePage(page), safeSize(size));
        Page<PartyLedgerSummaryResponse.UnpaidPurchaseSummary> result = purchaseRepository
                .findByParty_IdAndPaymentStatusNotOrderByPurchaseDateDescIdDesc(
                        partyId, Purchase.PaymentStatus.PAID, pageable)
                .map(this::toUnpaidSummary);
        return PageResponse.from(result);
    }

    private PageResponse<LedgerEntryResponse> loadEntries(Long partyId, Integer page, Integer size) {
        if (page == null || size == null) {
            List<LedgerEntryResponse> all = partyLedgerEntryRepository
                    .findByPartyIdOrderByEntryDateAscIdAsc(partyId)
                    .stream()
                    .map(LedgerEntryResponse::from)
                    .collect(Collectors.toList());
            return PageResponse.of(all);
        }

        Pageable pageable = PageRequest.of(safePage(page), safeSize(size));
        Page<LedgerEntryResponse> result = partyLedgerEntryRepository
                .findByPartyIdOrderByEntryDateDescIdDesc(partyId, pageable)
                .map(LedgerEntryResponse::from);
        return PageResponse.from(result);
    }

    private PartyLedgerSummaryResponse.UnpaidPurchaseSummary toUnpaidSummary(Purchase p) {
        return new PartyLedgerSummaryResponse.UnpaidPurchaseSummary(
                p.getId(),
                p.getPurchaseDate().toString(),
                p.getCommodityVariety().getName(),
                p.getNetPayable(),
                p.getAmountPaid(),
                p.getNetPayable().subtract(p.getAmountPaid()),
                p.getPaymentStatus().name()
        );
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
                            outstanding.subtract(p.getOpeningBalance()),
                            outstanding,
                            PageResponse.empty(),
                            PageResponse.empty()
                    );
                })
                .filter(s -> s.totalOutstanding().compareTo(BigDecimal.ZERO) != 0)
                .collect(Collectors.toList());
    }
}
