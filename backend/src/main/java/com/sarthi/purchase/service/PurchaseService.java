package com.sarthi.purchase.service;

import com.sarthi.audit.service.AuditService;
import com.sarthi.bardana.service.BardanaService;
import com.sarthi.common.exception.BusinessValidationException;
import com.sarthi.common.exception.ResourceNotFoundException;
import com.sarthi.master.entity.AppUser;
import com.sarthi.master.entity.CommoditySettings;
import com.sarthi.master.entity.CommodityVariety;
import com.sarthi.master.entity.Party;
import com.sarthi.master.repository.CommoditySettingsRepository;
import com.sarthi.master.repository.CommodityVarietyRepository;
import com.sarthi.master.repository.PartyRepository;
import com.sarthi.master.repository.UserRepository;
import com.sarthi.purchase.dto.PurchaseRequest;
import com.sarthi.purchase.entity.Purchase;
import com.sarthi.purchase.repository.PurchaseRepository;
import com.sarthi.stock.service.StockService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

@Service
public class PurchaseService {

    private final PurchaseRepository purchaseRepository;
    private final PartyRepository partyRepository;
    private final CommodityVarietyRepository commodityVarietyRepository;
    private final CommoditySettingsRepository commoditySettingsRepository;
    private final UserRepository userRepository;
    private final StockService stockService;
    private final BardanaService bardanaService;
    private final AuditService auditService;

    public PurchaseService(PurchaseRepository purchaseRepository,
                           PartyRepository partyRepository,
                           CommodityVarietyRepository commodityVarietyRepository,
                           CommoditySettingsRepository commoditySettingsRepository,
                           UserRepository userRepository,
                           StockService stockService,
                           BardanaService bardanaService,
                           AuditService auditService) {
        this.purchaseRepository = purchaseRepository;
        this.partyRepository = partyRepository;
        this.commodityVarietyRepository = commodityVarietyRepository;
        this.commoditySettingsRepository = commoditySettingsRepository;
        this.userRepository = userRepository;
        this.stockService = stockService;
        this.bardanaService = bardanaService;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<Purchase> getAllPurchases() {
        return purchaseRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Purchase getPurchaseById(Long id) {
        return purchaseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Purchase not found with ID: " + id));
    }

    @Transactional
    public Purchase createPurchase(PurchaseRequest request, String username) {
        AppUser currentUser = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with username: " + username));

        Purchase purchase = new Purchase();
        purchase.setCreatedBy(currentUser);
        purchase.setAmountPaid(BigDecimal.ZERO);
        purchase.setPaymentStatus(Purchase.PaymentStatus.UNPAID);
        purchase.setConfirmed(false);
        applyRequest(purchase, request);
        Purchase saved = purchaseRepository.save(purchase);
        auditService.record("Purchase", saved.getId(), "CREATE", null, purchaseSnapshot(saved));
        return saved;
    }

    @Transactional
    public Purchase updatePurchase(Long id, PurchaseRequest request) {
        Purchase purchase = getPurchaseById(id);
        if (purchase.isConfirmed()) {
            throw new BusinessValidationException("Cannot edit a confirmed purchase.");
        }
        var before = purchaseSnapshot(purchase);
        applyRequest(purchase, request);
        Purchase saved = purchaseRepository.save(purchase);
        auditService.record("Purchase", saved.getId(), "UPDATE", before, purchaseSnapshot(saved));
        return saved;
    }

    @Transactional
    public Purchase confirmPurchase(Long id) {
        Purchase purchase = getPurchaseById(id);
        if (purchase.isConfirmed()) {
            throw new BusinessValidationException("Purchase is already confirmed.");
        }

        stockService.incrementStock(
                purchase.getCommodityVariety().getId(),
                purchase.getWeightQuintals(),
                purchase.getBags()
        );

        purchase.setConfirmed(true);
        Purchase saved = purchaseRepository.save(purchase);
        bardanaService.postFromPurchase(saved);
        auditService.record("Purchase", saved.getId(), "CONFIRM",
                AuditService.mapOf("confirmed", false),
                purchaseSnapshot(saved));
        return saved;
    }

    @Transactional
    public void deletePurchase(Long id) {
        Purchase purchase = getPurchaseById(id);
        if (purchase.isConfirmed()) {
            throw new BusinessValidationException("Cannot delete a confirmed purchase.");
        }
        var snapshot = purchaseSnapshot(purchase);
        purchaseRepository.delete(purchase);
        auditService.record("Purchase", id, "DELETE", snapshot, null);
    }

    private void applyRequest(Purchase purchase, PurchaseRequest request) {
        Party party = partyRepository.findById(request.partyId())
                .orElseThrow(() -> new ResourceNotFoundException("Party not found with ID: " + request.partyId()));

        if (party.getType() == Party.PartyType.TRANSPORTER) {
            throw new BusinessValidationException("Cannot purchase from a Transporter party.");
        }

        CommodityVariety variety = commodityVarietyRepository.findById(request.commodityVarietyId())
                .orElseThrow(() -> new ResourceNotFoundException("Commodity variety not found with ID: " + request.commodityVarietyId()));

        CommoditySettings settings = commoditySettingsRepository.findByCommodityVarietyId(variety.getId())
                .orElseThrow(() -> new BusinessValidationException(
                        "Commodity settings are not configured for variety '" + variety.getName() + "'. Please configure settings first."
                ));

        Purchase.PurchaseType purchaseType = request.purchaseType() != null
                ? request.purchaseType()
                : Purchase.PurchaseType.DIRECT;

        BigDecimal weight = request.weightQuintals();
        BigDecimal rate = request.ratePerQuintal();
        BigDecimal grossAmount = weight.multiply(rate).setScale(2, RoundingMode.HALF_UP);

        BigDecimal gaushalaRate = BigDecimal.ZERO;
        BigDecimal gaushalaAmount = BigDecimal.ZERO;
        BigDecimal commissionRate = BigDecimal.ZERO;
        BigDecimal commissionAmount = BigDecimal.ZERO;
        BigDecimal cashDiscountPct = BigDecimal.ZERO;
        BigDecimal cashDiscountAmount = BigDecimal.ZERO;
        BigDecimal netPayable;
        String transportNumber = null;

        if (purchaseType == Purchase.PurchaseType.INDIRECT) {
            netPayable = grossAmount;
            transportNumber = normalizeTransportNumber(request.transportNumber());
        } else {
            gaushalaRate = settings.getGausharaRate();
            gaushalaAmount = weight.multiply(gaushalaRate).setScale(2, RoundingMode.HALF_UP);
            commissionRate = settings.getCommissionRate();
            commissionAmount = grossAmount.multiply(commissionRate)
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);

            final BigDecimal directCashDiscountPct = request.cashDiscountPct() != null
                    ? request.cashDiscountPct()
                    : BigDecimal.ZERO;
            if (directCashDiscountPct.compareTo(BigDecimal.ZERO) > 0) {
                List<BigDecimal> allowedDiscounts = settings.getAllowedCashDiscountList();
                boolean isAllowed = allowedDiscounts.stream()
                        .anyMatch(d -> d.compareTo(directCashDiscountPct) == 0);
                if (!isAllowed) {
                    throw new BusinessValidationException("Cash discount percentage " + directCashDiscountPct
                            + "% is not allowed. Allowed values: " + settings.getAllowedCashDiscounts());
                }
            }
            cashDiscountPct = directCashDiscountPct;
            cashDiscountAmount = grossAmount.multiply(directCashDiscountPct)
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            netPayable = grossAmount.subtract(gaushalaAmount).subtract(commissionAmount).subtract(cashDiscountAmount)
                    .setScale(2, RoundingMode.HALF_UP);
        }

        int bags = request.bags() != null ? request.bags() : 0;
        if (bags == 0 && settings.getBagWeightKg().compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal weightKg = weight.multiply(BigDecimal.valueOf(100));
            bags = weightKg.divide(settings.getBagWeightKg(), 0, RoundingMode.HALF_UP).intValue();
        }

        purchase.setPurchaseDate(request.purchaseDate());
        purchase.setPurchaseType(purchaseType);
        purchase.setTransportNumber(transportNumber);
        purchase.setParty(party);
        purchase.setCommodityVariety(variety);
        purchase.setWeightQuintals(weight);
        purchase.setBags(bags);
        purchase.setRatePerQuintal(rate);
        purchase.setGrossAmount(grossAmount);
        purchase.setGaushalaRate(gaushalaRate);
        purchase.setGaushalaAmount(gaushalaAmount);
        purchase.setCommissionRate(commissionRate);
        purchase.setCommissionAmount(commissionAmount);
        purchase.setCashDiscountPct(cashDiscountPct);
        purchase.setCashDiscountAmount(cashDiscountAmount);
        purchase.setNetPayable(netPayable);
        purchase.setRemarks(request.remarks());
    }

    private String normalizeTransportNumber(String transportNumber) {
        if (transportNumber == null) {
            return null;
        }
        String trimmed = transportNumber.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private java.util.Map<String, Object> purchaseSnapshot(Purchase p) {
        return AuditService.mapOf(
                "party", p.getParty() != null ? p.getParty().getName() : null,
                "purchaseType", p.getPurchaseType() != null ? p.getPurchaseType().name() : null,
                "transportNumber", p.getTransportNumber(),
                "netPayable", p.getNetPayable(),
                "weightQuintals", p.getWeightQuintals(),
                "confirmed", p.isConfirmed(),
                "paymentStatus", p.getPaymentStatus() != null ? p.getPaymentStatus().name() : null
        );
    }
}
