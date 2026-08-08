package com.sarthi.cashbook.repository;

import com.sarthi.cashbook.entity.CashBookEntry;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface CashBookEntryRepository extends JpaRepository<CashBookEntry, Long> {

    List<CashBookEntry> findByEntryDateOrderByIdAsc(LocalDate entryDate);

    List<CashBookEntry> findByEntryDateBetweenOrderByEntryDateAscIdAsc(LocalDate from, LocalDate to);

    Page<CashBookEntry> findByOrderByEntryDateDescIdDesc(Pageable pageable);

    Page<CashBookEntry> findByEntryDateBetweenOrderByEntryDateDescIdDesc(LocalDate from, LocalDate to, Pageable pageable);

    Optional<CashBookEntry> findFirstByOrderByEntryDateDescIdDesc();

    Optional<CashBookEntry> findFirstByEntryDateLessThanEqualOrderByEntryDateDescIdDesc(LocalDate date);

    @Query("""
        SELECT COALESCE(SUM(e.amount), 0) FROM CashBookEntry e
        WHERE e.party.id = :partyId AND e.type = :type
          AND e.linkedPurchase IS NULL AND e.linkedSaleId IS NULL
        """)
    BigDecimal sumUnlinkedByPartyAndType(@Param("partyId") Long partyId,
                                         @Param("type") CashBookEntry.EntryType type);
}
