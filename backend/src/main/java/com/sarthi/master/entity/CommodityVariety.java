package com.sarthi.master.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "commodity_variety",
       uniqueConstraints = @UniqueConstraint(columnNames = {"commodity_id", "name"}))
public class CommodityVariety {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "commodity_id", nullable = false)
    private Commodity commodity;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @OneToOne(mappedBy = "commodityVariety", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private CommoditySettings settings;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Commodity getCommodity() { return commodity; }
    public void setCommodity(Commodity commodity) { this.commodity = commodity; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public CommoditySettings getSettings() { return settings; }
    public void setSettings(CommoditySettings settings) { this.settings = settings; }
}
