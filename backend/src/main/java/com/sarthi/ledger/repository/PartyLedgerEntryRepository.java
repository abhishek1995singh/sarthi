package com.sarthi.ledger.repository;

import com.sarthi.ledger.entity.PartyLedgerEntry;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PartyLedgerEntryRepository extends JpaRepository<PartyLedgerEntry, Long> {

    List<PartyLedgerEntry> findByPartyIdOrderByEntryDateAscIdAsc(Long partyId);

    Page<PartyLedgerEntry> findByPartyIdOrderByEntryDateDescIdDesc(Long partyId, Pageable pageable);
}
