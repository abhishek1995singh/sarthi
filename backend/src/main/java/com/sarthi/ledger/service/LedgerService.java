package com.sarthi.ledger.service;

import com.sarthi.common.exception.ResourceNotFoundException;
import com.sarthi.ledger.dto.LedgerEntryResponse;
import com.sarthi.ledger.dto.PartyLedgerSummaryResponse;
import com.sarthi.ledger.repository.PartyLedgerEntryRepository;
import com.sarthi.master.entity.Party;
import com.sarthi.master.repository.PartyRepository;
import com.sarthi.purchase.entity.Purchase;
import com.sarthi.purchase.repository.PurchaseRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class LedgerService {

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
        Party party = partyRepository.findById(partyId)
                .orElseThrow(() -> new ResourceNotFoundException("Party not found with ID: " + partyId));

        List<Purchase> purchases = purchaseRepository.findByPartyId(partyId);

        BigDecimal purchaseOutstanding = purchases.stream()
                .map(p -> p.getNetPayable().subtract(p.getAmountPaid()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalOutstanding = ledgerPostingService.computePartyOutstanding(partyId);

        List<PartyLedgerSummaryResponse.UnpaidPurchaseSummary> unpaid = purchases.stream()
                .filter(p -> p.getPaymentStatus() != Purchase.PaymentStatus.PAID)
                .map(p -> new PartyLedgerSummaryResponse.UnpaidPurchaseSummary(
                        p.getId(),
                        p.getPurchaseDate().toString(),
                        p.getCommodityVariety().getName(),
                        p.getNetPayable(),
                        p.getAmountPaid(),
                        p.getNetPayable().subtract(p.getAmountPaid()),
                        p.getPaymentStatus().name()
                ))
                .collect(Collectors.toList());

        List<LedgerEntryResponse> entries = partyLedgerEntryRepository
                .findByPartyIdOrderByEntryDateAscIdAsc(partyId)
                .stream()
                .map(LedgerEntryResponse::from)
                .collect(Collectors.toList());

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
                            List.of(),
                            List.of()
                    );
                })
                .filter(s -> s.totalOutstanding().compareTo(BigDecimal.ZERO) != 0)
                .collect(Collectors.toList());
    }
}
