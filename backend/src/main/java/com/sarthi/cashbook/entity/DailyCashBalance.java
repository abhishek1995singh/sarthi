package com.sarthi.cashbook.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "daily_cash_balance")
public class DailyCashBalance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "balance_date", nullable = false, unique = true)
    private LocalDate balanceDate;

    @Column(name = "opening_balance", nullable = false, precision = 15, scale = 2)
    private BigDecimal openingBalance = BigDecimal.ZERO;

    @Column(name = "total_receipts", nullable = false, precision = 15, scale = 2)
    private BigDecimal totalReceipts = BigDecimal.ZERO;

    @Column(name = "total_payments", nullable = false, precision = 15, scale = 2)
    private BigDecimal totalPayments = BigDecimal.ZERO;

    /** Generated column in DB — never write from app. */
    @Column(name = "closing_balance", insertable = false, updatable = false, precision = 15, scale = 2)
    private BigDecimal closingBalance;

    @Column(nullable = false)
    private boolean finalized = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public LocalDate getBalanceDate() { return balanceDate; }
    public void setBalanceDate(LocalDate balanceDate) { this.balanceDate = balanceDate; }

    public BigDecimal getOpeningBalance() { return openingBalance; }
    public void setOpeningBalance(BigDecimal openingBalance) { this.openingBalance = openingBalance; }

    public BigDecimal getTotalReceipts() { return totalReceipts; }
    public void setTotalReceipts(BigDecimal totalReceipts) { this.totalReceipts = totalReceipts; }

    public BigDecimal getTotalPayments() { return totalPayments; }
    public void setTotalPayments(BigDecimal totalPayments) { this.totalPayments = totalPayments; }

    public BigDecimal getClosingBalance() {
        if (closingBalance != null) {
            return closingBalance;
        }
        return openingBalance.add(totalReceipts).subtract(totalPayments);
    }

    public boolean isFinalized() { return finalized; }
    public void setFinalized(boolean finalized) { this.finalized = finalized; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
