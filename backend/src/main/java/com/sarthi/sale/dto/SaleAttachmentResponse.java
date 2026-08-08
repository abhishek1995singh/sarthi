package com.sarthi.sale.dto;

import com.sarthi.sale.entity.SaleAttachment;

import java.time.LocalDateTime;

public record SaleAttachmentResponse(
        Long id,
        Long saleId,
        String originalFilename,
        String contentType,
        long sizeBytes,
        String uploadedByFullName,
        LocalDateTime createdAt
) {
    public static SaleAttachmentResponse from(SaleAttachment attachment) {
        return new SaleAttachmentResponse(
                attachment.getId(),
                attachment.getSale().getId(),
                attachment.getOriginalFilename(),
                attachment.getContentType(),
                attachment.getSizeBytes(),
                attachment.getUploadedBy() != null ? attachment.getUploadedBy().getFullName() : "System",
                attachment.getCreatedAt()
        );
    }
}
