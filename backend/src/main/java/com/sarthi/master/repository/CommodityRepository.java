package com.sarthi.master.repository;

import com.sarthi.master.entity.Commodity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface CommodityRepository extends JpaRepository<Commodity, Long> {
    List<Commodity> findByActiveTrue();
    boolean existsByName(String name);
}
