package com.sarthi.master.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "commodity")
public class Commodity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String name;

    @Column(name = "has_varieties", nullable = false)
    private boolean hasVarieties = true;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "commodity", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<CommodityVariety> varieties;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public boolean isHasVarieties() { return hasVarieties; }
    public void setHasVarieties(boolean hasVarieties) { this.hasVarieties = hasVarieties; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public List<CommodityVariety> getVarieties() { return varieties; }
    public void setVarieties(List<CommodityVariety> varieties) { this.varieties = varieties; }
}
