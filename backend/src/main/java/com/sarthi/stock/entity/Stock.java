package com.sarthi.stock.entity;

import com.sarthi.master.entity.CommodityVariety;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "stock")
public class Stock {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "commodity_variety_id", nullable = false, unique = true)
    private CommodityVariety commodityVariety;

    @Column(name = "quantity_quintals", nullable = false, precision = 12, scale = 3)
    private BigDecimal quantityQuintals = BigDecimal.ZERO;

    @Column(nullable = false)
    private Integer bags = 0;

    @Column(name = "last_updated", nullable = false)
    private LocalDateTime lastUpdated;

    @PrePersist
    @PreUpdate
    protected void onUpdate() {
        lastUpdated = LocalDateTime.now();
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public CommodityVariety getCommodityVariety() { return commodityVariety; }
    public void setCommodityVariety(CommodityVariety commodityVariety) { this.commodityVariety = commodityVariety; }

    public BigDecimal getQuantityQuintals() { return quantityQuintals; }
    public void setQuantityQuintals(BigDecimal quantityQuintals) { this.quantityQuintals = quantityQuintals; }

    public Integer getBags() { return bags; }
    public void setBags(Integer bags) { this.bags = bags; }

    public LocalDateTime getLastUpdated() { return lastUpdated; }
    public void setLastUpdated(LocalDateTime lastUpdated) { this.lastUpdated = lastUpdated; }
}
