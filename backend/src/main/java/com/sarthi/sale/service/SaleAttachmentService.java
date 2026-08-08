package com.sarthi.sale.service;

import com.sarthi.common.exception.BusinessValidationException;
import com.sarthi.common.exception.ResourceNotFoundException;
import com.sarthi.common.storage.FileStorageService;
import com.sarthi.master.entity.AppUser;
import com.sarthi.master.repository.UserRepository;
import com.sarthi.sale.dto.SaleAttachmentResponse;
import com.sarthi.sale.entity.Sale;
import com.sarthi.sale.entity.SaleAttachment;
import com.sarthi.sale.repository.SaleAttachmentRepository;
import com.sarthi.sale.repository.SaleRepository;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class SaleAttachmentService {

    private static final int MAX_ATTACHMENTS_PER_SALE = 20;
    private static final long MAX_FILE_BYTES = 10L * 1024 * 1024;

    private final SaleRepository saleRepository;
    private final SaleAttachmentRepository attachmentRepository;
    private final UserRepository userRepository;
    private final FileStorageService fileStorageService;

    public SaleAttachmentService(SaleRepository saleRepository,
                                 SaleAttachmentRepository attachmentRepository,
                                 UserRepository userRepository,
                                 FileStorageService fileStorageService) {
        this.saleRepository = saleRepository;
        this.attachmentRepository = attachmentRepository;
        this.userRepository = userRepository;
        this.fileStorageService = fileStorageService;
    }

    @Transactional(readOnly = true)
    public List<SaleAttachmentResponse> listForSale(Long saleId) {
        ensureSaleExists(saleId);
        return attachmentRepository.findBySaleIdOrderByCreatedAtDesc(saleId).stream()
                .map(SaleAttachmentResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public Map<Long, List<SaleAttachmentResponse>> listForSales(Collection<Long> saleIds) {
        if (saleIds == null || saleIds.isEmpty()) {
            return Map.of();
        }
        return attachmentRepository.findBySaleIdInOrderByCreatedAtDesc(saleIds).stream()
                .map(SaleAttachmentResponse::from)
                .collect(Collectors.groupingBy(SaleAttachmentResponse::saleId));
    }

    @Transactional
    public SaleAttachmentResponse upload(Long saleId, MultipartFile file, String username) {
        Sale sale = saleRepository.findById(saleId)
                .orElseThrow(() -> new ResourceNotFoundException("Sale", saleId));

        if (file == null || file.isEmpty()) {
            throw new BusinessValidationException("Choose a file to upload.");
        }
        if (file.getSize() > MAX_FILE_BYTES) {
            throw new BusinessValidationException("File exceeds 10 MB limit.");
        }

        long existing = attachmentRepository.countBySaleId(saleId);
        if (existing >= MAX_ATTACHMENTS_PER_SALE) {
            throw new BusinessValidationException("Maximum " + MAX_ATTACHMENTS_PER_SALE + " attachments per sale.");
        }

        AppUser user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));

        String storedFilename = fileStorageService.store(file);

        SaleAttachment attachment = new SaleAttachment();
        attachment.setSale(sale);
        attachment.setOriginalFilename(file.getOriginalFilename() != null ? file.getOriginalFilename() : "file");
        attachment.setStoredFilename(storedFilename);
        attachment.setContentType(file.getContentType());
        attachment.setSizeBytes(file.getSize());
        attachment.setUploadedBy(user);

        SaleAttachment saved = attachmentRepository.save(attachment);
        return SaleAttachmentResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public Resource download(Long saleId, Long attachmentId) {
        SaleAttachment attachment = attachmentRepository.findByIdAndSaleId(attachmentId, saleId)
                .orElseThrow(() -> new ResourceNotFoundException("Sale attachment", attachmentId));
        return fileStorageService.loadAsResource(attachment.getStoredFilename());
    }

    @Transactional(readOnly = true)
    public SaleAttachment getAttachment(Long saleId, Long attachmentId) {
        return attachmentRepository.findByIdAndSaleId(attachmentId, saleId)
                .orElseThrow(() -> new ResourceNotFoundException("Sale attachment", attachmentId));
    }

    @Transactional
    public void delete(Long saleId, Long attachmentId) {
        SaleAttachment attachment = attachmentRepository.findByIdAndSaleId(attachmentId, saleId)
                .orElseThrow(() -> new ResourceNotFoundException("Sale attachment", attachmentId));
        fileStorageService.delete(attachment.getStoredFilename());
        attachmentRepository.delete(attachment);
    }

    @Transactional
    public void deleteAllForSale(Long saleId) {
        List<SaleAttachment> attachments = attachmentRepository.findBySaleIdOrderByCreatedAtDesc(saleId);
        for (SaleAttachment attachment : attachments) {
            fileStorageService.delete(attachment.getStoredFilename());
        }
        attachmentRepository.deleteBySaleId(saleId);
    }

    private void ensureSaleExists(Long saleId) {
        if (!saleRepository.existsById(saleId)) {
            throw new ResourceNotFoundException("Sale", saleId);
        }
    }
}
