package com.sarthi.master.repository;

import com.sarthi.master.entity.CommoditySettings;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface CommoditySettingsRepository extends JpaRepository<CommoditySettings, Long> {
    Optional<CommoditySettings> findByCommodityVarietyId(Long varietyId);
}
