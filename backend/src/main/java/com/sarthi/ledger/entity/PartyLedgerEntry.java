package com.sarthi.ledger.entity;

import com.sarthi.cashbook.entity.CashBookEntry;
import com.sarthi.master.entity.CommodityVariety;
import com.sarthi.master.entity.Party;
import com.sarthi.purchase.entity.Purchase;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "party_ledger_entry")
public class PartyLedgerEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "party_id", nullable = false)
    private Party party;

    @Column(name = "entry_date", nullable = false)
    private LocalDate entryDate;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cash_book_entry_id", nullable = false, unique = true)
    private CashBookEntry cashBookEntry;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "purchase_id")
    private Purchase purchase;

    @Column(name = "sale_id")
    private Long saleId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "commodity_variety_id")
    private CommodityVariety commodityVariety;

    @Column(name = "amount_paid", nullable = false, precision = 15, scale = 2)
    private BigDecimal amountPaid;

    @Column(name = "outstanding_balance_after", nullable = false, precision = 15, scale = 2)
    private BigDecimal outstandingBalanceAfter;

    @Column(columnDefinition = "TEXT")
    private String narration;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Party getParty() { return party; }
    public void setParty(Party party) { this.party = party; }

    public LocalDate getEntryDate() { return entryDate; }
    public void setEntryDate(LocalDate entryDate) { this.entryDate = entryDate; }

    public CashBookEntry getCashBookEntry() { return cashBookEntry; }
    public void setCashBookEntry(CashBookEntry cashBookEntry) { this.cashBookEntry = cashBookEntry; }

    public Purchase getPurchase() { return purchase; }
    public void setPurchase(Purchase purchase) { this.purchase = purchase; }

    public Long getSaleId() { return saleId; }
    public void setSaleId(Long saleId) { this.saleId = saleId; }

    public CommodityVariety getCommodityVariety() { return commodityVariety; }
    public void setCommodityVariety(CommodityVariety commodityVariety) { this.commodityVariety = commodityVariety; }

    public BigDecimal getAmountPaid() { return amountPaid; }
    public void setAmountPaid(BigDecimal amountPaid) { this.amountPaid = amountPaid; }

    public BigDecimal getOutstandingBalanceAfter() { return outstandingBalanceAfter; }
    public void setOutstandingBalanceAfter(BigDecimal outstandingBalanceAfter) {
        this.outstandingBalanceAfter = outstandingBalanceAfter;
    }

    public String getNarration() { return narration; }
    public void setNarration(String narration) { this.narration = narration; }

    public LocalDateTime getCreatedAt() { return createdAt; }
}
