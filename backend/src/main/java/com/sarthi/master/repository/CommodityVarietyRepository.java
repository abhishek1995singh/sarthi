package com.sarthi.master.repository;

import com.sarthi.master.entity.CommodityVariety;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface CommodityVarietyRepository extends JpaRepository<CommodityVariety, Long> {
    List<CommodityVariety> findByCommodityIdAndActiveTrue(Long commodityId);
    List<CommodityVariety> findByActiveTrue();
}
