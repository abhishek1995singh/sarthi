package com.sarthi.sale.repository;

import com.sarthi.sale.entity.Sale;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface SaleRepository extends JpaRepository<Sale, Long> {
    List<Sale> findByBuyerId(Long buyerId);
    List<Sale> findAllByOrderBySaleDateDescIdDesc();
    List<Sale> findBySaleDateBetweenOrderBySaleDateAscIdAsc(LocalDate from, LocalDate to);
}
