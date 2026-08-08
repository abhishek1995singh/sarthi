package com.sarthi.sale.controller;

import com.sarthi.common.response.ApiResponse;
import com.sarthi.sale.dto.SaleAttachmentResponse;
import com.sarthi.sale.dto.SaleRequest;
import com.sarthi.sale.dto.SaleResponse;
import com.sarthi.sale.entity.Sale;
import com.sarthi.sale.entity.SaleAttachment;
import com.sarthi.sale.service.SaleAttachmentService;
import com.sarthi.sale.service.SaleService;
import jakarta.validation.Valid;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/sale")
public class SaleController {

    private final SaleService saleService;
    private final SaleAttachmentService attachmentService;

    public SaleController(SaleService saleService, SaleAttachmentService attachmentService) {
        this.saleService = saleService;
        this.attachmentService = attachmentService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<SaleResponse>>> getAll() {
        List<Sale> sales = saleService.getAllSales();
        Map<Long, List<SaleAttachmentResponse>> attachmentsBySale = attachmentService.listForSales(
                sales.stream().map(Sale::getId).toList()
        );
        List<SaleResponse> response = sales.stream()
                .map(sale -> SaleResponse.from(sale, attachmentsBySale.getOrDefault(sale.getId(), List.of())))
                .toList();
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<SaleResponse>> getById(@PathVariable Long id) {
        Sale sale = saleService.getSaleById(id);
        List<SaleAttachmentResponse> attachments = attachmentService.listForSale(id);
        return ResponseEntity.ok(ApiResponse.ok(SaleResponse.from(sale, attachments)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<SaleResponse>> create(
            @Valid @RequestBody SaleRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        Sale sale = saleService.createSale(request, userDetails.getUsername());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Sale recorded", SaleResponse.from(sale)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<SaleResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody SaleRequest request) {
        Sale sale = saleService.updateSale(id, request);
        List<SaleAttachmentResponse> attachments = attachmentService.listForSale(id);
        return ResponseEntity.ok(ApiResponse.ok("Sale draft updated", SaleResponse.from(sale, attachments)));
    }

    @PostMapping("/{id}/confirm")
    public ResponseEntity<ApiResponse<SaleResponse>> confirm(@PathVariable Long id) {
        Sale sale = saleService.confirmSale(id);
        List<SaleAttachmentResponse> attachments = attachmentService.listForSale(id);
        return ResponseEntity.ok(ApiResponse.ok("Sale confirmed and stock reduced", SaleResponse.from(sale, attachments)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        attachmentService.deleteAllForSale(id);
        saleService.deleteSale(id);
        return ResponseEntity.ok(ApiResponse.ok("Sale draft deleted", null));
    }

    @GetMapping("/{id}/attachments")
    public ResponseEntity<ApiResponse<List<SaleAttachmentResponse>>> listAttachments(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(attachmentService.listForSale(id)));
    }

    @PostMapping(value = "/{id}/attachments", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<SaleAttachmentResponse>> uploadAttachment(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal UserDetails userDetails) {
        SaleAttachmentResponse attachment = attachmentService.upload(id, file, userDetails.getUsername());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Attachment uploaded", attachment));
    }

    @GetMapping("/{id}/attachments/{attachmentId}/download")
    public ResponseEntity<Resource> downloadAttachment(
            @PathVariable Long id,
            @PathVariable Long attachmentId) {
        SaleAttachment attachment = attachmentService.getAttachment(id, attachmentId);
        Resource resource = attachmentService.download(id, attachmentId);
        String contentType = attachment.getContentType() != null
                ? attachment.getContentType()
                : MediaType.APPLICATION_OCTET_STREAM_VALUE;
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + sanitizeFilename(attachment.getOriginalFilename()) + "\"")
                .body(resource);
    }

    @DeleteMapping("/{id}/attachments/{attachmentId}")
    public ResponseEntity<ApiResponse<Void>> deleteAttachment(
            @PathVariable Long id,
            @PathVariable Long attachmentId) {
        attachmentService.delete(id, attachmentId);
        return ResponseEntity.ok(ApiResponse.ok("Attachment deleted", null));
    }

    private static String sanitizeFilename(String filename) {
        if (filename == null || filename.isBlank()) {
            return "download";
        }
        return filename.replace("\"", "'");
    }
}
