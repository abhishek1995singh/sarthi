package com.sarthi.sale.entity;

import com.sarthi.common.entity.BaseEntity;
import com.sarthi.master.entity.AppUser;
import com.sarthi.master.entity.CommodityVariety;
import com.sarthi.master.entity.Party;
import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "sale")
public class Sale extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "sale_date", nullable = false)
    private LocalDate saleDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "sale_type", nullable = false, length = 20)
    private SaleType saleType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "buyer_id", nullable = false)
    private Party buyer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "commodity_variety_id", nullable = false)
    private CommodityVariety commodityVariety;

    @Column(name = "quantity_quintals", nullable = false, precision = 10, scale = 3)
    private BigDecimal quantityQuintals;

    @Column(name = "rate_per_quintal", precision = 10, scale = 2)
    private BigDecimal ratePerQuintal;

    @Column(nullable = false)
    private Integer bags = 0;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "transporter_id")
    private Party transporter;

    @Column(name = "transport_charge", nullable = false, precision = 12, scale = 2)
    private BigDecimal transportCharge = BigDecimal.ZERO;

    @Column(name = "labour_charge", nullable = false, precision = 12, scale = 2)
    private BigDecimal labourCharge = BigDecimal.ZERO;

    @Column(name = "commission_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal commissionAmount = BigDecimal.ZERO;

    @Column(name = "tax_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal taxAmount = BigDecimal.ZERO;

    @Column(name = "total_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal totalAmount;

    @Column(name = "fob_details", columnDefinition = "TEXT")
    private String fobDetails;

    @Column(name = "amount_received", nullable = false, precision = 15, scale = 2)
    private BigDecimal amountReceived = BigDecimal.ZERO;

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

    public enum SaleType { FOB, RATE_BASED }

    public enum PaymentStatus { UNPAID, PARTIALLY_PAID, PAID }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public LocalDate getSaleDate() { return saleDate; }
    public void setSaleDate(LocalDate saleDate) { this.saleDate = saleDate; }

    public SaleType getSaleType() { return saleType; }
    public void setSaleType(SaleType saleType) { this.saleType = saleType; }

    public Party getBuyer() { return buyer; }
    public void setBuyer(Party buyer) { this.buyer = buyer; }

    public CommodityVariety getCommodityVariety() { return commodityVariety; }
    public void setCommodityVariety(CommodityVariety commodityVariety) { this.commodityVariety = commodityVariety; }

    public BigDecimal getQuantityQuintals() { return quantityQuintals; }
    public void setQuantityQuintals(BigDecimal quantityQuintals) { this.quantityQuintals = quantityQuintals; }

    public BigDecimal getRatePerQuintal() { return ratePerQuintal; }
    public void setRatePerQuintal(BigDecimal ratePerQuintal) { this.ratePerQuintal = ratePerQuintal; }

    public Integer getBags() { return bags; }
    public void setBags(Integer bags) { this.bags = bags; }

    public Party getTransporter() { return transporter; }
    public void setTransporter(Party transporter) { this.transporter = transporter; }

    public BigDecimal getTransportCharge() { return transportCharge; }
    public void setTransportCharge(BigDecimal transportCharge) { this.transportCharge = transportCharge; }

    public BigDecimal getLabourCharge() { return labourCharge; }
    public void setLabourCharge(BigDecimal labourCharge) { this.labourCharge = labourCharge; }

    public BigDecimal getCommissionAmount() { return commissionAmount; }
    public void setCommissionAmount(BigDecimal commissionAmount) { this.commissionAmount = commissionAmount; }

    public BigDecimal getTaxAmount() { return taxAmount; }
    public void setTaxAmount(BigDecimal taxAmount) { this.taxAmount = taxAmount; }

    public BigDecimal getTotalAmount() { return totalAmount; }
    public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }

    public String getFobDetails() { return fobDetails; }
    public void setFobDetails(String fobDetails) { this.fobDetails = fobDetails; }

    public BigDecimal getAmountReceived() { return amountReceived; }
    public void setAmountReceived(BigDecimal amountReceived) { this.amountReceived = amountReceived; }

    public PaymentStatus getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(PaymentStatus paymentStatus) { this.paymentStatus = paymentStatus; }

    public boolean isConfirmed() { return confirmed; }
    public void setConfirmed(boolean confirmed) { this.confirmed = confirmed; }

    public String getRemarks() { return remarks; }
    public void setRemarks(String remarks) { this.remarks = remarks; }

    public AppUser getCreatedBy() { return createdBy; }
    public void setCreatedBy(AppUser createdBy) { this.createdBy = createdBy; }
}
