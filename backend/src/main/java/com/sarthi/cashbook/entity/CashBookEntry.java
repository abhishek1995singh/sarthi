package com.sarthi.cashbook.entity;

import com.sarthi.master.entity.AppUser;
import com.sarthi.master.entity.Party;
import com.sarthi.purchase.entity.Purchase;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "cash_book_entry")
public class CashBookEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "entry_date", nullable = false)
    private LocalDate entryDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EntryType type;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "party_id")
    private Party party;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "linked_purchase_id")
    private Purchase linkedPurchase;

    @Column(name = "linked_sale_id")
    private Long linkedSaleId;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    @Column(name = "running_balance", nullable = false, precision = 15, scale = 2)
    private BigDecimal runningBalance;

    @Column(columnDefinition = "TEXT")
    private String remarks;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private AppUser createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public enum EntryType {
        RECEIPT, PAYMENT, OPENING_BALANCE
    }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public LocalDate getEntryDate() { return entryDate; }
    public void setEntryDate(LocalDate entryDate) { this.entryDate = entryDate; }

    public EntryType getType() { return type; }
    public void setType(EntryType type) { this.type = type; }

    public Party getParty() { return party; }
    public void setParty(Party party) { this.party = party; }

    public Purchase getLinkedPurchase() { return linkedPurchase; }
    public void setLinkedPurchase(Purchase linkedPurchase) { this.linkedPurchase = linkedPurchase; }

    public Long getLinkedSaleId() { return linkedSaleId; }
    public void setLinkedSaleId(Long linkedSaleId) { this.linkedSaleId = linkedSaleId; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public BigDecimal getRunningBalance() { return runningBalance; }
    public void setRunningBalance(BigDecimal runningBalance) { this.runningBalance = runningBalance; }

    public String getRemarks() { return remarks; }
    public void setRemarks(String remarks) { this.remarks = remarks; }

    public AppUser getCreatedBy() { return createdBy; }
    public void setCreatedBy(AppUser createdBy) { this.createdBy = createdBy; }

    public LocalDateTime getCreatedAt() { return createdAt; }
}
