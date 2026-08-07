package com.sarthi.ledger.service;

import com.sarthi.cashbook.entity.CashBookEntry;
import com.sarthi.cashbook.entity.DailyCashBalance;
import com.sarthi.cashbook.repository.CashBookEntryRepository;
import com.sarthi.cashbook.repository.DailyCashBalanceRepository;
import com.sarthi.common.exception.BusinessValidationException;
import com.sarthi.common.exception.ResourceNotFoundException;
import com.sarthi.ledger.entity.PartyLedgerEntry;
import com.sarthi.ledger.repository.PartyLedgerEntryRepository;
import com.sarthi.master.entity.AppUser;
import com.sarthi.master.entity.Party;
import com.sarthi.master.repository.PartyRepository;
import com.sarthi.master.repository.UserRepository;
import com.sarthi.purchase.entity.Purchase;
import com.sarthi.purchase.repository.PurchaseRepository;
import com.sarthi.sale.entity.Sale;
import com.sarthi.sale.repository.SaleRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Single transactional gateway for cash book + auto party-ledger posting.
 * Ledger entries are never created outside this service.
 */
@Service
public class LedgerPostingService {

    private final CashBookEntryRepository cashBookEntryRepository;
    private final DailyCashBalanceRepository dailyCashBalanceRepository;
    private final PartyLedgerEntryRepository partyLedgerEntryRepository;
    private final PartyRepository partyRepository;
    private final PurchaseRepository purchaseRepository;
    private final SaleRepository saleRepository;
    private final UserRepository userRepository;

    public LedgerPostingService(CashBookEntryRepository cashBookEntryRepository,
                                DailyCashBalanceRepository dailyCashBalanceRepository,
                                PartyLedgerEntryRepository partyLedgerEntryRepository,
                                PartyRepository partyRepository,
                                PurchaseRepository purchaseRepository,
                                SaleRepository saleRepository,
                                UserRepository userRepository) {
        this.cashBookEntryRepository = cashBookEntryRepository;
        this.dailyCashBalanceRepository = dailyCashBalanceRepository;
        this.partyLedgerEntryRepository = partyLedgerEntryRepository;
        this.partyRepository = partyRepository;
        this.purchaseRepository = purchaseRepository;
        this.saleRepository = saleRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public CashBookEntry postEntry(LocalDate entryDate,
                                   CashBookEntry.EntryType type,
                                   Long partyId,
                                   Long linkedPurchaseId,
                                   Long linkedSaleId,
                                   BigDecimal amount,
                                   String remarks,
                                   String username) {

        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessValidationException("Amount must be greater than zero.");
        }

        AppUser user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));

        Party party = null;
        if (partyId != null) {
            party = partyRepository.findById(partyId)
                    .orElseThrow(() -> new ResourceNotFoundException("Party not found with ID: " + partyId));
        }

        Purchase purchase = null;
        if (linkedPurchaseId != null) {
            purchase = purchaseRepository.findById(linkedPurchaseId)
                    .orElseThrow(() -> new ResourceNotFoundException("Purchase not found with ID: " + linkedPurchaseId));

            if (type != CashBookEntry.EntryType.PAYMENT) {
                throw new BusinessValidationException("Purchase-linked entries must be PAYMENT type.");
            }
            if (!purchase.isConfirmed()) {
                throw new BusinessValidationException("Cannot pay against an unconfirmed purchase.");
            }

            BigDecimal remaining = purchase.getNetPayable().subtract(purchase.getAmountPaid());
            if (amount.compareTo(remaining) > 0) {
                throw new BusinessValidationException(
                        "Payment amount ₹" + amount + " exceeds remaining payable ₹" + remaining + ".");
            }

            party = purchase.getParty();
        }

        Sale sale = null;
        if (linkedSaleId != null) {
            sale = saleRepository.findById(linkedSaleId)
                    .orElseThrow(() -> new ResourceNotFoundException("Sale", linkedSaleId));

            if (type != CashBookEntry.EntryType.RECEIPT) {
                throw new BusinessValidationException("Sale-linked entries must be RECEIPT type.");
            }
            if (!sale.isConfirmed()) {
                throw new BusinessValidationException("Cannot receive payment against an unconfirmed sale.");
            }

            BigDecimal remaining = sale.getTotalAmount().subtract(sale.getAmountReceived());
            if (amount.compareTo(remaining) > 0) {
                throw new BusinessValidationException(
                        "Receipt amount ₹" + amount + " exceeds remaining receivable ₹" + remaining + ".");
            }

            party = sale.getBuyer();
        }

        if (linkedPurchaseId != null && linkedSaleId != null) {
            throw new BusinessValidationException("An entry cannot link both purchase and sale.");
        }

        if (type == CashBookEntry.EntryType.OPENING_BALANCE) {
            throw new BusinessValidationException("Use the opening-balance endpoint to set daily opening cash.");
        }

        DailyCashBalance dayBalance = ensureDailyBalance(entryDate);

        var dayEntries = cashBookEntryRepository.findByEntryDateOrderByIdAsc(entryDate);
        BigDecimal previousRunning = dayEntries.isEmpty()
                ? dayBalance.getOpeningBalance()
                : dayEntries.get(dayEntries.size() - 1).getRunningBalance();

        BigDecimal newRunning = switch (type) {
            case RECEIPT -> previousRunning.add(amount);
            case PAYMENT -> previousRunning.subtract(amount);
            default -> previousRunning;
        };

        CashBookEntry entry = new CashBookEntry();
        entry.setEntryDate(entryDate);
        entry.setType(type);
        entry.setParty(party);
        entry.setLinkedPurchase(purchase);
        entry.setLinkedSaleId(linkedSaleId);
        entry.setAmount(amount);
        entry.setRunningBalance(newRunning);
        entry.setRemarks(remarks);
        entry.setCreatedBy(user);
        entry = cashBookEntryRepository.save(entry);

        if (type == CashBookEntry.EntryType.RECEIPT) {
            dayBalance.setTotalReceipts(dayBalance.getTotalReceipts().add(amount));
        } else if (type == CashBookEntry.EntryType.PAYMENT) {
            dayBalance.setTotalPayments(dayBalance.getTotalPayments().add(amount));
        }
        dailyCashBalanceRepository.save(dayBalance);

        BigDecimal linkedOutstandingAfter = null;
        if (purchase != null) {
            BigDecimal newPaid = purchase.getAmountPaid().add(amount);
            purchase.setAmountPaid(newPaid);
            purchase.setPaymentStatus(resolvePurchaseStatus(newPaid, purchase.getNetPayable()));
            purchaseRepository.save(purchase);
            linkedOutstandingAfter = purchase.getNetPayable().subtract(purchase.getAmountPaid());
        }

        if (sale != null) {
            BigDecimal newReceived = sale.getAmountReceived().add(amount);
            sale.setAmountReceived(newReceived);
            sale.setPaymentStatus(resolveSaleStatus(newReceived, sale.getTotalAmount()));
            saleRepository.save(sale);
            linkedOutstandingAfter = sale.getTotalAmount().subtract(sale.getAmountReceived());
        }

        if (party != null) {
            BigDecimal outstandingAfter = linkedOutstandingAfter != null
                    ? linkedOutstandingAfter
                    : computePartyOutstanding(party.getId());

            String narration = buildNarration(type, party, purchase, sale, amount, remarks);

            PartyLedgerEntry ledger = new PartyLedgerEntry();
            ledger.setParty(party);
            ledger.setEntryDate(entryDate);
            ledger.setCashBookEntry(entry);
            ledger.setPurchase(purchase);
            ledger.setSaleId(linkedSaleId);
            if (purchase != null) {
                ledger.setCommodityVariety(purchase.getCommodityVariety());
            } else if (sale != null) {
                ledger.setCommodityVariety(sale.getCommodityVariety());
            }
            ledger.setAmountPaid(amount);
            ledger.setOutstandingBalanceAfter(outstandingAfter);
            ledger.setNarration(narration);
            partyLedgerEntryRepository.save(ledger);
        }

        return entry;
    }

    @Transactional
    public DailyCashBalance ensureDailyBalance(LocalDate date) {
        return dailyCashBalanceRepository.findByBalanceDate(date)
                .orElseGet(() -> {
                    BigDecimal opening = dailyCashBalanceRepository
                            .findFirstByBalanceDateLessThanOrderByBalanceDateDesc(date)
                            .map(DailyCashBalance::getClosingBalance)
                            .orElse(BigDecimal.ZERO);

                    DailyCashBalance balance = new DailyCashBalance();
                    balance.setBalanceDate(date);
                    balance.setOpeningBalance(opening);
                    balance.setTotalReceipts(BigDecimal.ZERO);
                    balance.setTotalPayments(BigDecimal.ZERO);
                    return dailyCashBalanceRepository.save(balance);
                });
    }

    @Transactional
    public DailyCashBalance setOpeningBalance(LocalDate date, BigDecimal openingBalance) {
        DailyCashBalance balance = ensureDailyBalance(date);
        if (balance.isFinalized()) {
            throw new BusinessValidationException("Cannot change opening balance — day is finalized.");
        }
        if (!cashBookEntryRepository.findByEntryDateOrderByIdAsc(date).isEmpty()) {
            throw new BusinessValidationException("Cannot change opening balance after entries exist for this day.");
        }
        balance.setOpeningBalance(openingBalance);
        return dailyCashBalanceRepository.save(balance);
    }

    @Transactional
    public DailyCashBalance finalizeDay(LocalDate date) {
        DailyCashBalance balance = dailyCashBalanceRepository.findByBalanceDate(date)
                .orElseThrow(() -> new ResourceNotFoundException("No cash balance record for " + date));
        balance.setFinalized(true);
        return dailyCashBalanceRepository.save(balance);
    }

    public BigDecimal computePartyOutstanding(Long partyId) {
        Party party = partyRepository.findById(partyId)
                .orElseThrow(() -> new ResourceNotFoundException("Party not found with ID: " + partyId));

        BigDecimal purchaseOutstanding = purchaseRepository.findByPartyId(partyId).stream()
                .map(p -> p.getNetPayable().subtract(p.getAmountPaid()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal saleOutstanding = saleRepository.findByBuyerId(partyId).stream()
                .map(s -> s.getTotalAmount().subtract(s.getAmountReceived()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal unlinkedPayments = cashBookEntryRepository
                .sumUnlinkedByPartyAndType(partyId, CashBookEntry.EntryType.PAYMENT);
        BigDecimal unlinkedReceipts = cashBookEntryRepository
                .sumUnlinkedByPartyAndType(partyId, CashBookEntry.EntryType.RECEIPT);

        // Positive = we owe them (suppliers). Sale outstanding reduces what we owe / increases what they owe us.
        return party.getOpeningBalance()
                .add(purchaseOutstanding)
                .subtract(saleOutstanding)
                .subtract(unlinkedPayments != null ? unlinkedPayments : BigDecimal.ZERO)
                .add(unlinkedReceipts != null ? unlinkedReceipts : BigDecimal.ZERO);
    }

    private Purchase.PaymentStatus resolvePurchaseStatus(BigDecimal paid, BigDecimal net) {
        if (paid.compareTo(BigDecimal.ZERO) <= 0) return Purchase.PaymentStatus.UNPAID;
        if (paid.compareTo(net) >= 0) return Purchase.PaymentStatus.PAID;
        return Purchase.PaymentStatus.PARTIALLY_PAID;
    }

    private Sale.PaymentStatus resolveSaleStatus(BigDecimal received, BigDecimal total) {
        if (received.compareTo(BigDecimal.ZERO) <= 0) return Sale.PaymentStatus.UNPAID;
        if (received.compareTo(total) >= 0) return Sale.PaymentStatus.PAID;
        return Sale.PaymentStatus.PARTIALLY_PAID;
    }

    private String buildNarration(CashBookEntry.EntryType type, Party party, Purchase purchase, Sale sale,
                                  BigDecimal amount, String remarks) {
        StringBuilder sb = new StringBuilder();
        if (type == CashBookEntry.EntryType.PAYMENT) {
            sb.append("Payment to ").append(party.getName());
        } else {
            sb.append("Receipt from ").append(party.getName());
        }
        sb.append(" — ₹").append(amount);
        if (purchase != null) {
            sb.append(" against Purchase #").append(purchase.getId());
        }
        if (sale != null) {
            sb.append(" against Sale #").append(sale.getId());
        }
        if (remarks != null && !remarks.isBlank()) {
            sb.append(". ").append(remarks);
        }
        return sb.toString();
    }
}
