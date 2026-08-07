package com.sarthi.purchase.service;

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

    public PurchaseService(PurchaseRepository purchaseRepository,
                           PartyRepository partyRepository,
                           CommodityVarietyRepository commodityVarietyRepository,
                           CommoditySettingsRepository commoditySettingsRepository,
                           UserRepository userRepository,
                           StockService stockService,
                           BardanaService bardanaService) {
        this.purchaseRepository = purchaseRepository;
        this.partyRepository = partyRepository;
        this.commodityVarietyRepository = commodityVarietyRepository;
        this.commoditySettingsRepository = commoditySettingsRepository;
        this.userRepository = userRepository;
        this.stockService = stockService;
        this.bardanaService = bardanaService;
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

        BigDecimal weight = request.weightQuintals();
        BigDecimal rate = request.ratePerQuintal();

        // Calculations
        BigDecimal grossAmount = weight.multiply(rate).setScale(2, RoundingMode.HALF_UP);
        BigDecimal gaushalaRate = settings.getGausharaRate();
        BigDecimal gaushalaAmount = weight.multiply(gaushalaRate).setScale(2, RoundingMode.HALF_UP);

        BigDecimal commissionRate = settings.getCommissionRate();
        BigDecimal commissionAmount = grossAmount.multiply(commissionRate).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);

        BigDecimal cashDiscountPct = request.cashDiscountPct() != null ? request.cashDiscountPct() : BigDecimal.ZERO;
        if (cashDiscountPct.compareTo(BigDecimal.ZERO) > 0) {
            List<BigDecimal> allowedDiscounts = settings.getAllowedCashDiscountList();
            boolean isAllowed = allowedDiscounts.stream()
                    .anyMatch(d -> d.compareTo(cashDiscountPct) == 0);
            if (!isAllowed) {
                throw new BusinessValidationException("Cash discount percentage " + cashDiscountPct + "% is not allowed. Allowed values: " + settings.getAllowedCashDiscounts());
            }
        }
        BigDecimal cashDiscountAmount = grossAmount.multiply(cashDiscountPct).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);

        // netPayable = grossAmount - gaushalaAmount - commissionAmount - cashDiscountAmount
        BigDecimal netPayable = grossAmount.subtract(gaushalaAmount).subtract(commissionAmount).subtract(cashDiscountAmount)
                .setScale(2, RoundingMode.HALF_UP);

        Purchase purchase = new Purchase();
        purchase.setPurchaseDate(request.purchaseDate());
        purchase.setParty(party);
        purchase.setCommodityVariety(variety);
        purchase.setWeightQuintals(weight);

        // Standard bag weight to auto-calculate bags if count not provided
        int bags = request.bags() != null ? request.bags() : 0;
        if (bags == 0 && settings.getBagWeightKg().compareTo(BigDecimal.ZERO) > 0) {
            // weight in kg = weight in quintals * 100
            BigDecimal weightKg = weight.multiply(BigDecimal.valueOf(100));
            bags = weightKg.divide(settings.getBagWeightKg(), 0, RoundingMode.HALF_UP).intValue();
        }
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
        purchase.setAmountPaid(BigDecimal.ZERO);
        purchase.setPaymentStatus(Purchase.PaymentStatus.UNPAID);
        purchase.setConfirmed(false);
        purchase.setRemarks(request.remarks());
        purchase.setCreatedBy(currentUser);

        return purchaseRepository.save(purchase);
    }

    @Transactional
    public Purchase confirmPurchase(Long id) {
        Purchase purchase = getPurchaseById(id);
        if (purchase.isConfirmed()) {
            throw new BusinessValidationException("Purchase is already confirmed.");
        }

        // Increment stock
        stockService.incrementStock(
                purchase.getCommodityVariety().getId(),
                purchase.getWeightQuintals(),
                purchase.getBags()
        );

        purchase.setConfirmed(true);
        Purchase saved = purchaseRepository.save(purchase);
        bardanaService.postFromPurchase(saved);
        return saved;
    }

    @Transactional
    public void deletePurchase(Long id) {
        Purchase purchase = getPurchaseById(id);
        if (purchase.isConfirmed()) {
            throw new BusinessValidationException("Cannot delete a confirmed purchase.");
        }
        purchaseRepository.delete(purchase);
    }
}
