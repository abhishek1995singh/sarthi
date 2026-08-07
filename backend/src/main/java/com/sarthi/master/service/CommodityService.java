package com.sarthi.master.service;

import com.sarthi.common.exception.BusinessValidationException;
import com.sarthi.common.exception.ResourceNotFoundException;
import com.sarthi.master.dto.CommodityResponse;
import com.sarthi.master.dto.CommoditySettingsRequest;
import com.sarthi.master.dto.CommoditySettingsResponse;
import com.sarthi.master.dto.CommodityVarietyResponse;
import com.sarthi.master.entity.Commodity;
import com.sarthi.master.entity.CommoditySettings;
import com.sarthi.master.entity.CommodityVariety;
import com.sarthi.master.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class CommodityService {

    private final CommodityRepository commodityRepository;
    private final CommodityVarietyRepository varietyRepository;
    private final CommoditySettingsRepository settingsRepository;

    public CommodityService(CommodityRepository commodityRepository,
                            CommodityVarietyRepository varietyRepository,
                            CommoditySettingsRepository settingsRepository) {
        this.commodityRepository = commodityRepository;
        this.varietyRepository = varietyRepository;
        this.settingsRepository = settingsRepository;
    }

    public List<CommodityResponse> getAllCommodities() {
        return commodityRepository.findByActiveTrue().stream()
                .map(commodity -> CommodityResponse.from(
                        commodity,
                        varietyRepository.findByCommodityIdAndActiveTrue(commodity.getId())))
                .toList();
    }

    public List<CommodityVarietyResponse> getVarietiesByCommodity(Long commodityId) {
        if (!commodityRepository.existsById(commodityId)) {
            throw new ResourceNotFoundException("Commodity", commodityId);
        }
        return varietyRepository.findByCommodityIdAndActiveTrue(commodityId).stream()
                .map(CommodityVarietyResponse::from)
                .toList();
    }

    @Transactional
    public CommodityResponse createCommodity(String name, boolean hasVarieties) {
        if (commodityRepository.existsByName(name)) {
            throw new BusinessValidationException("Commodity '" + name + "' already exists.");
        }
        Commodity c = new Commodity();
        c.setName(name);
        c.setHasVarieties(hasVarieties);
        Commodity saved = commodityRepository.save(c);
        return CommodityResponse.from(saved, List.of());
    }

    @Transactional
    public CommodityVarietyResponse addVariety(Long commodityId, String varietyName) {
        Commodity commodity = commodityRepository.findById(commodityId)
                .orElseThrow(() -> new ResourceNotFoundException("Commodity", commodityId));
        CommodityVariety variety = new CommodityVariety();
        variety.setCommodity(commodity);
        variety.setName(varietyName);
        CommodityVariety saved = varietyRepository.save(variety);

        // Auto-create default settings for the new variety
        CommoditySettings settings = new CommoditySettings();
        settings.setCommodityVariety(saved);
        settingsRepository.save(settings);

        return CommodityVarietyResponse.from(saved);
    }

    public CommoditySettingsResponse getSettings(Long varietyId) {
        CommoditySettings settings = settingsRepository.findByCommodityVarietyId(varietyId)
                .orElseThrow(() -> new ResourceNotFoundException("Settings for variety", varietyId));
        return CommoditySettingsResponse.from(settings);
    }

    @Transactional
    public CommoditySettingsResponse updateSettings(Long varietyId, CommoditySettingsRequest request) {
        CommoditySettings settings = settingsRepository.findByCommodityVarietyId(varietyId)
                .orElseThrow(() -> new ResourceNotFoundException("Settings for variety", varietyId));

        settings.setGausharaRate(request.gausharaRate());
        settings.setCommissionRate(request.commissionRate());
        settings.setAllowedCashDiscounts(request.allowedCashDiscounts());
        settings.setBardanaMode(request.bardanaMode());
        settings.setBagWeightKg(request.bagWeightKg());
        settings.setSaleTaxRate(request.saleTaxRate());
        settings.setLabourRateBasis(request.labourRateBasis());
        settings.setLabourRate(request.labourRate());

        return CommoditySettingsResponse.from(settingsRepository.save(settings));
    }
}
