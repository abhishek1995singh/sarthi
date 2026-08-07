package com.sarthi.master.repository;

import com.sarthi.master.entity.Party;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface PartyRepository extends JpaRepository<Party, Long> {
    List<Party> findByTypeAndActiveTrue(Party.PartyType type);
    List<Party> findByActiveTrue();
    boolean existsByNameAndType(String name, Party.PartyType type);
}
