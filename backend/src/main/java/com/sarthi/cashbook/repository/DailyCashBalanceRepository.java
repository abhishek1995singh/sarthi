package com.sarthi.cashbook.repository;

import com.sarthi.cashbook.entity.DailyCashBalance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Optional;

@Repository
public interface DailyCashBalanceRepository extends JpaRepository<DailyCashBalance, Long> {

    Optional<DailyCashBalance> findByBalanceDate(LocalDate balanceDate);

    Optional<DailyCashBalance> findFirstByBalanceDateLessThanOrderByBalanceDateDesc(LocalDate balanceDate);
}
