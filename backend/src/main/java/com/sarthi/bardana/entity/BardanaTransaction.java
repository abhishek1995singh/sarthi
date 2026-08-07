package com.sarthi.bardana.entity;

import com.sarthi.master.entity.AppUser;
import com.sarthi.master.entity.CommodityVariety;
import com.sarthi.master.entity.Party;
import com.sarthi.purchase.entity.Purchase;
import com.sarthi.sale.entity.Sale;
import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "bardana_transaction")
public class BardanaTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "transaction_date", nullable = false)
    private LocalDate transactionDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Type type;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "party_id", nullable = false)
    private Party party;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "commodity_variety_id", nullable = false)
    private CommodityVariety commodityVariety;

    @Column(nullable = false)
    private Integer bags;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Mode mode;

    @Column(precision = 12, scale = 2)
    private BigDecimal amount;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "linked_purchase_id")
    private Purchase linkedPurchase;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "linked_sale_id")
    private Sale linkedSale;

    @Column(columnDefinition = "TEXT")
    private String remarks;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private AppUser createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public enum Type { RECEIVED, ISSUED, RETURNED, ADJUSTMENT }

    public enum Mode { EXCHANGE, COST_INCLUDED }

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public LocalDate getTransactionDate() { return transactionDate; }
    public void setTransactionDate(LocalDate transactionDate) { this.transactionDate = transactionDate; }
    public Type getType() { return type; }
    public void setType(Type type) { this.type = type; }
    public Party getParty() { return party; }
    public void setParty(Party party) { this.party = party; }
    public CommodityVariety getCommodityVariety() { return commodityVariety; }
    public void setCommodityVariety(CommodityVariety commodityVariety) { this.commodityVariety = commodityVariety; }
    public Integer getBags() { return bags; }
    public void setBags(Integer bags) { this.bags = bags; }
    public Mode getMode() { return mode; }
    public void setMode(Mode mode) { this.mode = mode; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public Purchase getLinkedPurchase() { return linkedPurchase; }
    public void setLinkedPurchase(Purchase linkedPurchase) { this.linkedPurchase = linkedPurchase; }
    public Sale getLinkedSale() { return linkedSale; }
    public void setLinkedSale(Sale linkedSale) { this.linkedSale = linkedSale; }
    public String getRemarks() { return remarks; }
    public void setRemarks(String remarks) { this.remarks = remarks; }
    public AppUser getCreatedBy() { return createdBy; }
    public void setCreatedBy(AppUser createdBy) { this.createdBy = createdBy; }
    public Instant getCreatedAt() { return createdAt; }
}
