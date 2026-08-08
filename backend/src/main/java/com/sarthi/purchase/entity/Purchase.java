package com.sarthi.purchase.entity;

import com.sarthi.common.entity.BaseEntity;
import com.sarthi.master.entity.CommodityVariety;
import com.sarthi.master.entity.Party;
import com.sarthi.master.entity.AppUser;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "purchase")
public class Purchase extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "purchase_date", nullable = false)
    private LocalDate purchaseDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "purchase_type", nullable = false, length = 20)
    private PurchaseType purchaseType = PurchaseType.DIRECT;

    @Column(name = "transport_number", length = 50)
    private String transportNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "party_id", nullable = false)
    private Party party;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "commodity_variety_id", nullable = false)
    private CommodityVariety commodityVariety;

    @Column(name = "weight_quintals", nullable = false, precision = 10, scale = 3)
    private BigDecimal weightQuintals;

    @Column(nullable = false)
    private Integer bags = 0;

    @Column(name = "rate_per_quintal", nullable = false, precision = 10, scale = 2)
    private BigDecimal ratePerQuintal;

    @Column(name = "gross_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal grossAmount;

    @Column(name = "gaushala_rate", nullable = false, precision = 8, scale = 2)
    private BigDecimal gaushalaRate;

    @Column(name = "gaushala_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal gaushalaAmount;

    @Column(name = "commission_rate", nullable = false, precision = 5, scale = 2)
    private BigDecimal commissionRate;

    @Column(name = "commission_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal commissionAmount;

    @Column(name = "cash_discount_pct", nullable = false, precision = 5, scale = 2)
    private BigDecimal cashDiscountPct = BigDecimal.ZERO;

    @Column(name = "cash_discount_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal cashDiscountAmount = BigDecimal.ZERO;

    @Column(name = "net_payable", nullable = false, precision = 15, scale = 2)
    private BigDecimal netPayable;

    @Column(name = "amount_paid", nullable = false, precision = 15, scale = 2)
    private BigDecimal amountPaid = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_status", nullable = false, length = 20)
    private PaymentStatus paymentStatus = PaymentStatus.UNPAID;

    @Column(nullable = false)
    private boolean confirmed = false;

    @Column(columnDefinition = "TEXT")
    private String remarks;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private AppUser createdBy;

    public enum PaymentStatus {
        UNPAID, PARTIALLY_PAID, PAID
    }

    public enum PurchaseType {
        DIRECT, INDIRECT
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public LocalDate getPurchaseDate() { return purchaseDate; }
    public void setPurchaseDate(LocalDate purchaseDate) { this.purchaseDate = purchaseDate; }

    public PurchaseType getPurchaseType() { return purchaseType; }
    public void setPurchaseType(PurchaseType purchaseType) { this.purchaseType = purchaseType; }

    public String getTransportNumber() { return transportNumber; }
    public void setTransportNumber(String transportNumber) { this.transportNumber = transportNumber; }

    public Party getParty() { return party; }
    public void setParty(Party party) { this.party = party; }

    public CommodityVariety getCommodityVariety() { return commodityVariety; }
    public void setCommodityVariety(CommodityVariety commodityVariety) { this.commodityVariety = commodityVariety; }

    public BigDecimal getWeightQuintals() { return weightQuintals; }
    public void setWeightQuintals(BigDecimal weightQuintals) { this.weightQuintals = weightQuintals; }

    public Integer getBags() { return bags; }
    public void setBags(Integer bags) { this.bags = bags; }

    public BigDecimal getRatePerQuintal() { return ratePerQuintal; }
    public void setRatePerQuintal(BigDecimal ratePerQuintal) { this.ratePerQuintal = ratePerQuintal; }

    public BigDecimal getGrossAmount() { return grossAmount; }
    public void setGrossAmount(BigDecimal grossAmount) { this.grossAmount = grossAmount; }

    public BigDecimal getGaushalaRate() { return gaushalaRate; }
    public void setGaushalaRate(BigDecimal gaushalaRate) { this.gaushalaRate = gaushalaRate; }

    public BigDecimal getGaushalaAmount() { return gaushalaAmount; }
    public void setGaushalaAmount(BigDecimal gaushalaAmount) { this.gaushalaAmount = gaushalaAmount; }

    public BigDecimal getCommissionRate() { return commissionRate; }
    public void setCommissionRate(BigDecimal commissionRate) { this.commissionRate = commissionRate; }

    public BigDecimal getCommissionAmount() { return commissionAmount; }
    public void setCommissionAmount(BigDecimal commissionAmount) { this.commissionAmount = commissionAmount; }

    public BigDecimal getCashDiscountPct() { return cashDiscountPct; }
    public void setCashDiscountPct(BigDecimal cashDiscountPct) { this.cashDiscountPct = cashDiscountPct; }

    public BigDecimal getCashDiscountAmount() { return cashDiscountAmount; }
    public void setCashDiscountAmount(BigDecimal cashDiscountAmount) { this.cashDiscountAmount = cashDiscountAmount; }

    public BigDecimal getNetPayable() { return netPayable; }
    public void setNetPayable(BigDecimal netPayable) { this.netPayable = netPayable; }

    public BigDecimal getAmountPaid() { return amountPaid; }
    public void setAmountPaid(BigDecimal amountPaid) { this.amountPaid = amountPaid; }

    public PaymentStatus getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(PaymentStatus paymentStatus) { this.paymentStatus = paymentStatus; }

    public boolean isConfirmed() { return confirmed; }
    public void setConfirmed(boolean confirmed) { this.confirmed = confirmed; }

    public String getRemarks() { return remarks; }
    public void setRemarks(String remarks) { this.remarks = remarks; }

    public AppUser getCreatedBy() { return createdBy; }
    public void setCreatedBy(AppUser createdBy) { this.createdBy = createdBy; }
}
