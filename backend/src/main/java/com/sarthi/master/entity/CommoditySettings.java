package com.sarthi.master.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Entity
@Table(name = "commodity_settings")
public class CommoditySettings {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "commodity_variety_id", nullable = false, unique = true)
    private CommodityVariety commodityVariety;

    @Column(name = "gaushala_rate", nullable = false, precision = 8, scale = 2)
    private BigDecimal gausharaRate = new BigDecimal("3.00");

    @Column(name = "commission_rate", nullable = false, precision = 5, scale = 2)
    private BigDecimal commissionRate = new BigDecimal("1.50");

    // Stored as comma-separated string, e.g. "0.5,1.0,1.5,2.0"
    @Column(name = "allowed_cash_discounts", nullable = false, length = 50)
    private String allowedCashDiscounts = "0.5,1.0,1.5,2.0";

    @Enumerated(EnumType.STRING)
    @Column(name = "bardana_mode", nullable = false, length = 20)
    private BardanaMode bardanaMode = BardanaMode.EXCHANGE;

    @Column(name = "bag_weight_kg", nullable = false, precision = 6, scale = 2)
    private BigDecimal bagWeightKg = new BigDecimal("40.00");

    @Column(name = "sale_tax_rate", nullable = false, precision = 5, scale = 2)
    private BigDecimal saleTaxRate = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(name = "labour_rate_basis", nullable = false, length = 20)
    private LabourRateBasis labourRateBasis = LabourRateBasis.PER_QUINTAL;

    @Column(name = "labour_rate", nullable = false, precision = 8, scale = 2)
    private BigDecimal labourRate = BigDecimal.ZERO;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public enum BardanaMode { EXCHANGE, COST_INCLUDED }
    public enum LabourRateBasis { PER_BAG, PER_QUINTAL, FLAT }

    /**
     * Returns allowed cash discount percentages as a typed list.
     * Business rule: discounts are stored as configurable CSV, never hardcoded.
     */
    public List<BigDecimal> getAllowedCashDiscountList() {
        return Arrays.stream(allowedCashDiscounts.split(","))
                .map(String::trim)
                .map(BigDecimal::new)
                .collect(Collectors.toList());
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public CommodityVariety getCommodityVariety() { return commodityVariety; }
    public void setCommodityVariety(CommodityVariety cv) { this.commodityVariety = cv; }
    public BigDecimal getGausharaRate() { return gausharaRate; }
    public void setGausharaRate(BigDecimal r) { this.gausharaRate = r; }
    public BigDecimal getCommissionRate() { return commissionRate; }
    public void setCommissionRate(BigDecimal r) { this.commissionRate = r; }
    public String getAllowedCashDiscounts() { return allowedCashDiscounts; }
    public void setAllowedCashDiscounts(String d) { this.allowedCashDiscounts = d; }
    public BardanaMode getBardanaMode() { return bardanaMode; }
    public void setBardanaMode(BardanaMode m) { this.bardanaMode = m; }
    public BigDecimal getBagWeightKg() { return bagWeightKg; }
    public void setBagWeightKg(BigDecimal w) { this.bagWeightKg = w; }
    public BigDecimal getSaleTaxRate() { return saleTaxRate; }
    public void setSaleTaxRate(BigDecimal r) { this.saleTaxRate = r; }
    public LabourRateBasis getLabourRateBasis() { return labourRateBasis; }
    public void setLabourRateBasis(LabourRateBasis b) { this.labourRateBasis = b; }
    public BigDecimal getLabourRate() { return labourRate; }
    public void setLabourRate(BigDecimal r) { this.labourRate = r; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
