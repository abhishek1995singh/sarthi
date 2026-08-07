package com.sarthi.report.service;

import com.sarthi.bardana.dto.BardanaBalanceResponse;
import com.sarthi.bardana.service.BardanaService;
import com.sarthi.cashbook.entity.CashBookEntry;
import com.sarthi.cashbook.repository.CashBookEntryRepository;
import com.sarthi.common.exception.BusinessValidationException;
import com.sarthi.ledger.dto.PartyLedgerSummaryResponse;
import com.sarthi.ledger.service.LedgerService;
import com.sarthi.purchase.entity.Purchase;
import com.sarthi.purchase.repository.PurchaseRepository;
import com.sarthi.report.dto.CashFlowReportResponse;
import com.sarthi.report.dto.PurchaseSaleReportResponse;
import com.sarthi.sale.entity.Sale;
import com.sarthi.sale.repository.SaleRepository;
import com.sarthi.stock.dto.StockResponse;
import com.sarthi.stock.service.StockService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Service
public class ReportService {

    private final CashBookEntryRepository cashBookEntryRepository;
    private final PurchaseRepository purchaseRepository;
    private final SaleRepository saleRepository;
    private final StockService stockService;
    private final BardanaService bardanaService;
    private final LedgerService ledgerService;

    public ReportService(CashBookEntryRepository cashBookEntryRepository,
                         PurchaseRepository purchaseRepository,
                         SaleRepository saleRepository,
                         StockService stockService,
                         BardanaService bardanaService,
                         LedgerService ledgerService) {
        this.cashBookEntryRepository = cashBookEntryRepository;
        this.purchaseRepository = purchaseRepository;
        this.saleRepository = saleRepository;
        this.stockService = stockService;
        this.bardanaService = bardanaService;
        this.ledgerService = ledgerService;
    }

    @Transactional(readOnly = true)
    public CashFlowReportResponse cashFlow(LocalDate from, LocalDate to) {
        validateRange(from, to);
        List<CashBookEntry> entries = cashBookEntryRepository
                .findByEntryDateBetweenOrderByEntryDateAscIdAsc(from, to);

        BigDecimal receipts = BigDecimal.ZERO;
        BigDecimal payments = BigDecimal.ZERO;
        for (CashBookEntry e : entries) {
            if (e.getType() == CashBookEntry.EntryType.RECEIPT
                    || e.getType() == CashBookEntry.EntryType.OPENING_BALANCE) {
                receipts = receipts.add(e.getAmount());
            } else if (e.getType() == CashBookEntry.EntryType.PAYMENT) {
                payments = payments.add(e.getAmount());
            }
        }

        List<CashFlowReportResponse.CashFlowRow> rows = entries.stream()
                .map(e -> new CashFlowReportResponse.CashFlowRow(
                        e.getEntryDate(),
                        e.getType().name(),
                        e.getParty() != null ? e.getParty().getName() : null,
                        e.getAmount(),
                        e.getRunningBalance(),
                        e.getRemarks()
                ))
                .toList();

        return new CashFlowReportResponse(
                from, to, receipts, payments, receipts.subtract(payments), rows);
    }

    @Transactional(readOnly = true)
    public PurchaseSaleReportResponse purchaseSale(LocalDate from, LocalDate to) {
        validateRange(from, to);
        List<Purchase> purchases = purchaseRepository
                .findByPurchaseDateBetweenOrderByPurchaseDateAscIdAsc(from, to);
        List<Sale> sales = saleRepository
                .findBySaleDateBetweenOrderBySaleDateAscIdAsc(from, to);

        BigDecimal purchaseTotal = purchases.stream()
                .map(Purchase::getNetPayable)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal saleTotal = sales.stream()
                .map(Sale::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<PurchaseSaleReportResponse.PurchaseRow> purchaseRows = purchases.stream()
                .map(p -> new PurchaseSaleReportResponse.PurchaseRow(
                        p.getId(),
                        p.getPurchaseDate(),
                        p.getParty().getName(),
                        p.getCommodityVariety().getCommodity().getName(),
                        p.getCommodityVariety().getName(),
                        p.getWeightQuintals(),
                        p.getBags(),
                        p.getNetPayable(),
                        p.getPaymentStatus().name(),
                        p.isConfirmed()
                ))
                .toList();

        List<PurchaseSaleReportResponse.SaleRow> saleRows = sales.stream()
                .map(s -> new PurchaseSaleReportResponse.SaleRow(
                        s.getId(),
                        s.getSaleDate(),
                        s.getBuyer().getName(),
                        s.getCommodityVariety().getCommodity().getName(),
                        s.getCommodityVariety().getName(),
                        s.getQuantityQuintals(),
                        s.getBags(),
                        s.getTotalAmount(),
                        s.getPaymentStatus().name(),
                        s.isConfirmed()
                ))
                .toList();

        return new PurchaseSaleReportResponse(
                from, to, purchaseTotal, saleTotal, purchaseRows, saleRows);
    }

    @Transactional(readOnly = true)
    public List<StockResponse> stock() {
        return stockService.getAllStock().stream().map(StockResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<BardanaBalanceResponse> bardanaBalances(Long partyId) {
        return bardanaService.balances(partyId);
    }

    @Transactional(readOnly = true)
    public PartyLedgerSummaryResponse partyLedger(Long partyId) {
        return ledgerService.getPartyLedger(partyId);
    }

    private void validateRange(LocalDate from, LocalDate to) {
        if (from == null || to == null) {
            throw new BusinessValidationException("from and to dates are required");
        }
        if (to.isBefore(from)) {
            throw new BusinessValidationException("to date must be on or after from date");
        }
    }
}
