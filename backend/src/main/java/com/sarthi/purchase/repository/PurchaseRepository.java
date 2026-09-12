package com.sarthi.purchase.repository;

import com.sarthi.purchase.entity.Purchase;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface PurchaseRepository extends JpaRepository<Purchase, Long> {
    List<Purchase> findByPartyId(Long partyId);

    List<Purchase> findByPurchaseDateBetweenOrderByPurchaseDateAscIdAsc(LocalDate from, LocalDate to);
}
