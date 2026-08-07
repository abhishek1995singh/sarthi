package com.sarthi.sale.service;

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
import com.sarthi.sale.dto.SaleRequest;
import com.sarthi.sale.entity.Sale;
import com.sarthi.sale.repository.SaleRepository;
import com.sarthi.stock.service.StockService;
import com.sarthi.bardana.service.BardanaService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

@Service
public class SaleService {

    private final SaleRepository saleRepository;
    private final PartyRepository partyRepository;
    private final CommodityVarietyRepository commodityVarietyRepository;
    private final CommoditySettingsRepository commoditySettingsRepository;
    private final UserRepository userRepository;
    private final StockService stockService;
    private final BardanaService bardanaService;

    public SaleService(SaleRepository saleRepository,
                       PartyRepository partyRepository,
                       CommodityVarietyRepository commodityVarietyRepository,
                       CommoditySettingsRepository commoditySettingsRepository,
                       UserRepository userRepository,
                       StockService stockService,
                       BardanaService bardanaService) {
        this.saleRepository = saleRepository;
        this.partyRepository = partyRepository;
        this.commodityVarietyRepository = commodityVarietyRepository;
        this.commoditySettingsRepository = commoditySettingsRepository;
        this.userRepository = userRepository;
        this.stockService = stockService;
        this.bardanaService = bardanaService;
    }

    @Transactional(readOnly = true)
    public List<Sale> getAllSales() {
        return saleRepository.findAllByOrderBySaleDateDescIdDesc();
    }

    @Transactional(readOnly = true)
    public Sale getSaleById(Long id) {
        return saleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Sale", id));
    }

    @Transactional
    public Sale createSale(SaleRequest request, String username) {
        AppUser user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));

        Sale sale = new Sale();
        sale.setCreatedBy(user);
        sale.setAmountReceived(BigDecimal.ZERO);
        sale.setPaymentStatus(Sale.PaymentStatus.UNPAID);
        sale.setConfirmed(false);
        applyRequestToSale(sale, request);
        return saleRepository.save(sale);
    }

    @Transactional
    public Sale updateSale(Long id, SaleRequest request) {
        Sale sale = getSaleById(id);
        if (sale.isConfirmed()) {
            throw new BusinessValidationException("Confirmed sales cannot be edited. Only drafts can be updated.");
        }
        applyRequestToSale(sale, request);
        return saleRepository.save(sale);
    }

    private void applyRequestToSale(Sale sale, SaleRequest request) {
        Party buyer = partyRepository.findById(request.buyerId())
                .orElseThrow(() -> new ResourceNotFoundException("Party", request.buyerId()));

        if (buyer.getType() == Party.PartyType.TRANSPORTER || buyer.getType() == Party.PartyType.AADHTI) {
            throw new BusinessValidationException("Sale buyer must be a BUYER or MILL party.");
        }

        CommodityVariety variety = commodityVarietyRepository.findById(request.commodityVarietyId())
                .orElseThrow(() -> new ResourceNotFoundException("Commodity variety", request.commodityVarietyId()));

        CommoditySettings settings = commoditySettingsRepository.findByCommodityVarietyId(variety.getId())
                .orElseThrow(() -> new BusinessValidationException(
                        "Commodity settings are not configured for variety '" + variety.getName() + "'."));

        Party transporter = null;
        if (request.transporterId() != null) {
            transporter = partyRepository.findById(request.transporterId())
                    .orElseThrow(() -> new ResourceNotFoundException("Transporter", request.transporterId()));
            if (transporter.getType() != Party.PartyType.TRANSPORTER) {
                throw new BusinessValidationException("Selected transporter party must have type TRANSPORTER.");
            }
        }

        BigDecimal qty = request.quantityQuintals();
        int bags = request.bags() != null ? request.bags() : 0;
        if (bags == 0 && settings.getBagWeightKg().compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal weightKg = qty.multiply(BigDecimal.valueOf(100));
            bags = weightKg.divide(settings.getBagWeightKg(), 0, RoundingMode.HALF_UP).intValue();
        }

        sale.setSaleDate(request.saleDate());
        sale.setSaleType(request.saleType());
        sale.setBuyer(buyer);
        sale.setCommodityVariety(variety);
        sale.setQuantityQuintals(qty);
        sale.setBags(bags);
        sale.setTransporter(transporter);
        sale.setTransportCharge(nz(request.transportCharge()));
        sale.setRemarks(request.remarks());

        BigDecimal labourOverride = request.labourCharge();
        if (request.saleType() == Sale.SaleType.RATE_BASED) {
            if (request.ratePerQuintal() == null) {
                throw new BusinessValidationException("Rate per quintal is required for rate-based sales.");
            }
            applyRateBasedBilling(sale, request.ratePerQuintal(), settings, labourOverride);
        } else {
            applyFobBilling(sale, request, settings, labourOverride);
        }
    }

    private void applyRateBasedBilling(Sale sale, BigDecimal rate, CommoditySettings settings,
                                       BigDecimal labourOverride) {
        BigDecimal qty = sale.getQuantityQuintals();
        BigDecimal base = qty.multiply(rate).setScale(2, RoundingMode.HALF_UP);

        BigDecimal commission = base.multiply(settings.getCommissionRate())
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        BigDecimal tax = base.multiply(settings.getSaleTaxRate())
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        BigDecimal labour = labourOverride != null
                ? labourOverride.setScale(2, RoundingMode.HALF_UP)
                : computeLabour(settings, qty, sale.getBags());

        BigDecimal total = base.add(commission).add(tax).add(labour).add(sale.getTransportCharge())
                .setScale(2, RoundingMode.HALF_UP);

        sale.setRatePerQuintal(rate);
        sale.setCommissionAmount(commission);
        sale.setTaxAmount(tax);
        sale.setLabourCharge(labour);
        sale.setTotalAmount(total);
        sale.setFobDetails(null);
    }

    private void applyFobBilling(Sale sale, SaleRequest request, CommoditySettings settings,
                                 BigDecimal labourOverride) {
        if (request.fobDetails() == null || request.fobDetails().isBlank()) {
            throw new BusinessValidationException("FOB details are required for FOB sales.");
        }

        BigDecimal labour = labourOverride != null
                ? labourOverride.setScale(2, RoundingMode.HALF_UP)
                : computeLabour(settings, sale.getQuantityQuintals(), sale.getBags());

        BigDecimal commission = BigDecimal.ZERO;
        BigDecimal tax = BigDecimal.ZERO;
        BigDecimal rate = request.ratePerQuintal();
        BigDecimal total;

        if (rate != null) {
            BigDecimal base = sale.getQuantityQuintals().multiply(rate).setScale(2, RoundingMode.HALF_UP);
            commission = base.multiply(settings.getCommissionRate())
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            tax = base.multiply(settings.getSaleTaxRate())
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            total = base.add(commission).add(tax).add(labour).add(sale.getTransportCharge())
                    .setScale(2, RoundingMode.HALF_UP);
        } else {
            if (request.totalAmount() == null) {
                throw new BusinessValidationException("Provide either rate or total amount for FOB sales.");
            }
            total = request.totalAmount().setScale(2, RoundingMode.HALF_UP);
        }

        sale.setRatePerQuintal(rate);
        sale.setCommissionAmount(commission);
        sale.setTaxAmount(tax);
        sale.setLabourCharge(labour);
        sale.setTotalAmount(total);
        sale.setFobDetails(request.fobDetails().trim());
    }

    private BigDecimal computeLabour(CommoditySettings settings, BigDecimal qty, int bags) {
        BigDecimal rate = settings.getLabourRate();
        if (rate == null || rate.compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO;
        }
        return switch (settings.getLabourRateBasis()) {
            case PER_BAG -> rate.multiply(BigDecimal.valueOf(bags)).setScale(2, RoundingMode.HALF_UP);
            case PER_QUINTAL -> rate.multiply(qty).setScale(2, RoundingMode.HALF_UP);
            case FLAT -> rate.setScale(2, RoundingMode.HALF_UP);
        };
    }

    @Transactional
    public Sale confirmSale(Long id) {
        Sale sale = getSaleById(id);
        if (sale.isConfirmed()) {
            throw new BusinessValidationException("Sale is already confirmed.");
        }

        try {
            stockService.decrementStock(
                    sale.getCommodityVariety().getId(),
                    sale.getQuantityQuintals(),
                    sale.getBags()
            );
        } catch (IllegalArgumentException ex) {
            throw new BusinessValidationException(ex.getMessage());
        }

        sale.setConfirmed(true);
        Sale saved = saleRepository.save(sale);
        bardanaService.postFromSale(saved);
        return saved;
    }

    @Transactional
    public void deleteSale(Long id) {
        Sale sale = getSaleById(id);
        if (sale.isConfirmed()) {
            throw new BusinessValidationException("Cannot delete a confirmed sale.");
        }
        saleRepository.delete(sale);
    }

    private static BigDecimal nz(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }
}
