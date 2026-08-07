package com.sarthi.bardana.service;

import com.sarthi.bardana.dto.BardanaBalanceResponse;
import com.sarthi.bardana.dto.BardanaTransactionRequest;
import com.sarthi.bardana.entity.BardanaTransaction;
import com.sarthi.bardana.repository.BardanaTransactionRepository;
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
import com.sarthi.purchase.entity.Purchase;
import com.sarthi.purchase.repository.PurchaseRepository;
import com.sarthi.sale.entity.Sale;
import com.sarthi.sale.repository.SaleRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
public class BardanaService {

    private final BardanaTransactionRepository bardanaRepository;
    private final PartyRepository partyRepository;
    private final CommodityVarietyRepository varietyRepository;
    private final CommoditySettingsRepository settingsRepository;
    private final UserRepository userRepository;
    private final PurchaseRepository purchaseRepository;
    private final SaleRepository saleRepository;

    public BardanaService(BardanaTransactionRepository bardanaRepository,
                          PartyRepository partyRepository,
                          CommodityVarietyRepository varietyRepository,
                          CommoditySettingsRepository settingsRepository,
                          UserRepository userRepository,
                          PurchaseRepository purchaseRepository,
                          SaleRepository saleRepository) {
        this.bardanaRepository = bardanaRepository;
        this.partyRepository = partyRepository;
        this.varietyRepository = varietyRepository;
        this.settingsRepository = settingsRepository;
        this.userRepository = userRepository;
        this.purchaseRepository = purchaseRepository;
        this.saleRepository = saleRepository;
    }

    @Transactional(readOnly = true)
    public List<BardanaTransaction> list(Long partyId, LocalDate from, LocalDate to) {
        if (partyId != null) {
            return bardanaRepository.findByPartyIdOrderByTransactionDateDescIdDesc(partyId);
        }
        if (from != null && to != null) {
            return bardanaRepository.findByTransactionDateBetweenOrderByTransactionDateDescIdDesc(from, to);
        }
        return bardanaRepository.findAllByOrderByTransactionDateDescIdDesc();
    }

    @Transactional(readOnly = true)
    public List<BardanaBalanceResponse> balances(Long partyId) {
        List<Object[]> rows = bardanaRepository.aggregateBalances(partyId);
        List<BardanaBalanceResponse> result = new ArrayList<>();
        for (Object[] row : rows) {
            Long pId = ((Number) row[0]).longValue();
            Long vId = ((Number) row[1]).longValue();
            int bags = ((Number) row[2]).intValue();
            Party party = partyRepository.findById(pId).orElse(null);
            CommodityVariety variety = varietyRepository.findById(vId).orElse(null);
            result.add(new BardanaBalanceResponse(
                    pId,
                    party != null ? party.getName() : ("#" + pId),
                    vId,
                    variety != null ? variety.getName() : ("#" + vId),
                    variety != null && variety.getCommodity() != null ? variety.getCommodity().getName() : null,
                    bags
            ));
        }
        return result;
    }

    @Transactional
    public BardanaTransaction create(BardanaTransactionRequest request, String username) {
        if (request.bags() == null || request.bags() == 0) {
            throw new BusinessValidationException("Bags must be non-zero.");
        }
        if (request.type() == BardanaTransaction.Type.ADJUSTMENT) {
            // allowed: signed via bags (positive or negative)
        } else if (request.bags() < 0) {
            throw new BusinessValidationException("Bags must be positive for " + request.type());
        }

        AppUser user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));
        Party party = partyRepository.findById(request.partyId())
                .orElseThrow(() -> new ResourceNotFoundException("Party not found: " + request.partyId()));
        CommodityVariety variety = varietyRepository.findById(request.commodityVarietyId())
                .orElseThrow(() -> new ResourceNotFoundException("Variety not found: " + request.commodityVarietyId()));

        BardanaTransaction.Mode mode = request.mode();
        if (mode == null) {
            mode = settingsRepository.findByCommodityVarietyId(variety.getId())
                    .map(CommoditySettings::getBardanaMode)
                    .map(m -> BardanaTransaction.Mode.valueOf(m.name()))
                    .orElse(BardanaTransaction.Mode.EXCHANGE);
        }

        if (mode == BardanaTransaction.Mode.COST_INCLUDED
                && request.amount() == null
                && request.type() != BardanaTransaction.Type.ADJUSTMENT) {
            // amount optional but recommended — allow null for tracking-only
        }

        BardanaTransaction tx = new BardanaTransaction();
        tx.setTransactionDate(request.transactionDate());
        tx.setType(request.type());
        tx.setParty(party);
        tx.setCommodityVariety(variety);
        tx.setBags(request.bags());
        tx.setMode(mode);
        tx.setAmount(request.amount());
        tx.setRemarks(request.remarks());
        tx.setCreatedBy(user);

        if (request.linkedPurchaseId() != null) {
            Purchase purchase = purchaseRepository.findById(request.linkedPurchaseId())
                    .orElseThrow(() -> new ResourceNotFoundException("Purchase not found"));
            tx.setLinkedPurchase(purchase);
        }
        if (request.linkedSaleId() != null) {
            Sale sale = saleRepository.findById(request.linkedSaleId())
                    .orElseThrow(() -> new ResourceNotFoundException("Sale not found"));
            tx.setLinkedSale(sale);
        }

        return bardanaRepository.save(tx);
    }

    @Transactional
    public void delete(Long id) {
        BardanaTransaction tx = bardanaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Bardana transaction not found: " + id));
        if (tx.getLinkedPurchase() != null || tx.getLinkedSale() != null) {
            throw new BusinessValidationException("Cannot delete auto-posted bardana linked to purchase/sale.");
        }
        bardanaRepository.delete(tx);
    }

    /** Auto-post bags received with a confirmed purchase. */
    @Transactional
    public void postFromPurchase(Purchase purchase) {
        if (purchase.getBags() == null || purchase.getBags() == 0) {
            return;
        }
        if (bardanaRepository.existsByLinkedPurchaseId(purchase.getId())) {
            return;
        }
        CommoditySettings settings = settingsRepository
                .findByCommodityVarietyId(purchase.getCommodityVariety().getId())
                .orElse(null);
        BardanaTransaction.Mode mode = settings != null
                ? BardanaTransaction.Mode.valueOf(settings.getBardanaMode().name())
                : BardanaTransaction.Mode.EXCHANGE;

        BardanaTransaction tx = new BardanaTransaction();
        tx.setTransactionDate(purchase.getPurchaseDate());
        tx.setType(BardanaTransaction.Type.RECEIVED);
        tx.setParty(purchase.getParty());
        tx.setCommodityVariety(purchase.getCommodityVariety());
        tx.setBags(purchase.getBags());
        tx.setMode(mode);
        tx.setAmount(null);
        tx.setLinkedPurchase(purchase);
        tx.setRemarks("Auto: purchase #" + purchase.getId());
        tx.setCreatedBy(purchase.getCreatedBy());
        bardanaRepository.save(tx);
    }

    /** Auto-post bags issued with a confirmed sale. */
    @Transactional
    public void postFromSale(Sale sale) {
        if (sale.getBags() == null || sale.getBags() == 0) {
            return;
        }
        if (bardanaRepository.existsByLinkedSaleId(sale.getId())) {
            return;
        }
        CommoditySettings settings = settingsRepository
                .findByCommodityVarietyId(sale.getCommodityVariety().getId())
                .orElse(null);
        BardanaTransaction.Mode mode = settings != null
                ? BardanaTransaction.Mode.valueOf(settings.getBardanaMode().name())
                : BardanaTransaction.Mode.EXCHANGE;

        BardanaTransaction tx = new BardanaTransaction();
        tx.setTransactionDate(sale.getSaleDate());
        tx.setType(BardanaTransaction.Type.ISSUED);
        tx.setParty(sale.getBuyer());
        tx.setCommodityVariety(sale.getCommodityVariety());
        tx.setBags(sale.getBags());
        tx.setMode(mode);
        tx.setAmount(null);
        tx.setLinkedSale(sale);
        tx.setRemarks("Auto: sale #" + sale.getId());
        tx.setCreatedBy(sale.getCreatedBy());
        bardanaRepository.save(tx);
    }
}
