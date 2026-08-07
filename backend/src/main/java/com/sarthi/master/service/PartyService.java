package com.sarthi.master.service;

import com.sarthi.audit.service.AuditService;
import com.sarthi.common.exception.BusinessValidationException;
import com.sarthi.common.exception.ResourceNotFoundException;
import com.sarthi.master.dto.PartyRequest;
import com.sarthi.master.dto.PartyResponse;
import com.sarthi.master.entity.Party;
import com.sarthi.master.repository.PartyRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class PartyService {

    private final PartyRepository partyRepository;
    private final AuditService auditService;

    public PartyService(PartyRepository partyRepository, AuditService auditService) {
        this.partyRepository = partyRepository;
        this.auditService = auditService;
    }

    public List<PartyResponse> getAll() {
        return partyRepository.findByActiveTrue().stream()
                .map(PartyResponse::from).toList();
    }

    public List<PartyResponse> getByType(Party.PartyType type) {
        return partyRepository.findByTypeAndActiveTrue(type).stream()
                .map(PartyResponse::from).toList();
    }

    public PartyResponse getById(Long id) {
        return PartyResponse.from(findOrThrow(id));
    }

    @Transactional
    public PartyResponse create(PartyRequest request) {
        if (partyRepository.existsByNameAndType(request.name(), request.type())) {
            throw new BusinessValidationException(
                    "A party named '" + request.name() + "' already exists with type " + request.type());
        }
        Party party = new Party();
        mapRequest(party, request);
        Party saved = partyRepository.save(party);
        auditService.record("Party", saved.getId(), "CREATE", null, partySnapshot(saved));
        return PartyResponse.from(saved);
    }

    @Transactional
    public PartyResponse update(Long id, PartyRequest request) {
        Party party = findOrThrow(id);
        var old = partySnapshot(party);
        mapRequest(party, request);
        Party saved = partyRepository.save(party);
        auditService.record("Party", saved.getId(), "UPDATE", old, partySnapshot(saved));
        return PartyResponse.from(saved);
    }

    @Transactional
    public void deactivate(Long id) {
        Party party = findOrThrow(id);
        var old = partySnapshot(party);
        party.setActive(false);
        partyRepository.save(party);
        auditService.record("Party", id, "DELETE", old,
                AuditService.mapOf("active", false, "name", party.getName()));
    }

    private Party findOrThrow(Long id) {
        return partyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Party", id));
    }

    private void mapRequest(Party party, PartyRequest req) {
        party.setName(req.name());
        party.setType(req.type());
        party.setContactPerson(req.contactPerson());
        party.setPhone(req.phone());
        party.setAddress(req.address());
        party.setGstin(req.gstin());
        if (req.openingBalance() != null) party.setOpeningBalance(req.openingBalance());
    }

    private java.util.Map<String, Object> partySnapshot(Party p) {
        return AuditService.mapOf(
                "name", p.getName(),
                "type", p.getType() != null ? p.getType().name() : null,
                "phone", p.getPhone(),
                "active", p.isActive(),
                "openingBalance", p.getOpeningBalance()
        );
    }
}
