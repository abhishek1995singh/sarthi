package com.sarthi.purchase.repository;

import com.sarthi.purchase.entity.Purchase;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Repository
public interface PurchaseRepository extends JpaRepository<Purchase, Long> {
    List<Purchase> findByPartyId(Long partyId);

    List<Purchase> findByPurchaseDateBetweenOrderByPurchaseDateAscIdAsc(LocalDate from, LocalDate to);

    Page<Purchase> findByParty_IdAndPaymentStatusNotOrderByPurchaseDateDescIdDesc(
            Long partyId, Purchase.PaymentStatus paymentStatus, Pageable pageable);

    @Query("SELECT COALESCE(SUM(p.netPayable - p.amountPaid), 0) FROM Purchase p WHERE p.party.id = :partyId")
    BigDecimal sumOutstandingByPartyId(@Param("partyId") Long partyId);
}
