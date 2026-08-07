package com.sarthi.master.controller;

import com.sarthi.common.response.ApiResponse;
import com.sarthi.master.dto.CommodityResponse;
import com.sarthi.master.dto.CommoditySettingsRequest;
import com.sarthi.master.dto.CommoditySettingsResponse;
import com.sarthi.master.dto.CommodityVarietyResponse;
import com.sarthi.master.service.CommodityService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/masters/commodities")
public class CommodityController {

    private final CommodityService commodityService;

    public CommodityController(CommodityService commodityService) {
        this.commodityService = commodityService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<CommodityResponse>>> getAll() {
        return ResponseEntity.ok(ApiResponse.ok(commodityService.getAllCommodities()));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<CommodityResponse>> create(@RequestBody Map<String, Object> body) {
        String name = (String) body.get("name");
        boolean hasVarieties = body.containsKey("hasVarieties") && (Boolean) body.get("hasVarieties");
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Commodity created", commodityService.createCommodity(name, hasVarieties)));
    }

    @GetMapping("/{commodityId}/varieties")
    public ResponseEntity<ApiResponse<List<CommodityVarietyResponse>>> getVarieties(@PathVariable Long commodityId) {
        return ResponseEntity.ok(ApiResponse.ok(commodityService.getVarietiesByCommodity(commodityId)));
    }

    @PostMapping("/{commodityId}/varieties")
    public ResponseEntity<ApiResponse<CommodityVarietyResponse>> addVariety(
            @PathVariable Long commodityId, @RequestBody Map<String, String> body) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Variety added", commodityService.addVariety(commodityId, body.get("name"))));
    }

    @GetMapping("/varieties/{varietyId}/settings")
    public ResponseEntity<ApiResponse<CommoditySettingsResponse>> getSettings(@PathVariable Long varietyId) {
        return ResponseEntity.ok(ApiResponse.ok(commodityService.getSettings(varietyId)));
    }

    @PutMapping("/varieties/{varietyId}/settings")
    public ResponseEntity<ApiResponse<CommoditySettingsResponse>> updateSettings(
            @PathVariable Long varietyId, @Valid @RequestBody CommoditySettingsRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Settings updated", commodityService.updateSettings(varietyId, request)));
    }
}
