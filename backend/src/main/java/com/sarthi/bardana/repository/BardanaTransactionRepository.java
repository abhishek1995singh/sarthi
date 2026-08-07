package com.sarthi.bardana.repository;

import com.sarthi.bardana.entity.BardanaTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface BardanaTransactionRepository extends JpaRepository<BardanaTransaction, Long> {

    List<BardanaTransaction> findAllByOrderByTransactionDateDescIdDesc();

    List<BardanaTransaction> findByPartyIdOrderByTransactionDateDescIdDesc(Long partyId);

    List<BardanaTransaction> findByTransactionDateBetweenOrderByTransactionDateDescIdDesc(
            LocalDate from, LocalDate to);

    boolean existsByLinkedPurchaseId(Long purchaseId);

    boolean existsByLinkedSaleId(Long saleId);

    @Query(value = """
            SELECT party_id,
                   commodity_variety_id,
                   SUM(CASE
                       WHEN type = 'RECEIVED' THEN bags
                       WHEN type = 'RETURNED' THEN bags
                       WHEN type = 'ISSUED' THEN -bags
                       WHEN type = 'ADJUSTMENT' THEN bags
                       ELSE 0
                   END) AS balance_bags
            FROM bardana_transaction
            WHERE (:partyId IS NULL OR party_id = :partyId)
            GROUP BY party_id, commodity_variety_id
            HAVING SUM(CASE
                       WHEN type = 'RECEIVED' THEN bags
                       WHEN type = 'RETURNED' THEN bags
                       WHEN type = 'ISSUED' THEN -bags
                       WHEN type = 'ADJUSTMENT' THEN bags
                       ELSE 0
                   END) <> 0
            ORDER BY party_id, commodity_variety_id
            """, nativeQuery = true)
    List<Object[]> aggregateBalances(@Param("partyId") Long partyId);
}
