package com.sarthi.sale.repository;

import com.sarthi.sale.entity.SaleAttachment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface SaleAttachmentRepository extends JpaRepository<SaleAttachment, Long> {

    List<SaleAttachment> findBySaleIdOrderByCreatedAtDesc(Long saleId);

    List<SaleAttachment> findBySaleIdInOrderByCreatedAtDesc(Collection<Long> saleIds);

    Optional<SaleAttachment> findByIdAndSaleId(Long id, Long saleId);

    long countBySaleId(Long saleId);

    void deleteBySaleId(Long saleId);
}
