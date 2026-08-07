package com.sarthi.master.controller;

import com.sarthi.common.response.ApiResponse;
import com.sarthi.master.dto.PartyRequest;
import com.sarthi.master.dto.PartyResponse;
import com.sarthi.master.entity.Party;
import com.sarthi.master.service.PartyService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/masters/parties")
public class PartyController {

    private final PartyService partyService;

    public PartyController(PartyService partyService) {
        this.partyService = partyService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<PartyResponse>>> getAll(
            @RequestParam(required = false) Party.PartyType type) {
        List<PartyResponse> result = type != null
                ? partyService.getByType(type)
                : partyService.getAll();
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<PartyResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(partyService.getById(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<PartyResponse>> create(@Valid @RequestBody PartyRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Party created successfully", partyService.create(request)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<PartyResponse>> update(
            @PathVariable Long id, @Valid @RequestBody PartyRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Party updated successfully", partyService.update(id, request)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deactivate(@PathVariable Long id) {
        partyService.deactivate(id);
        return ResponseEntity.ok(ApiResponse.ok("Party deactivated", null));
    }
}
