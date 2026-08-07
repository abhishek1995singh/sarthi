package com.sarthi.master.service;

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

    public PartyService(PartyRepository partyRepository) {
        this.partyRepository = partyRepository;
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
        return PartyResponse.from(partyRepository.save(party));
    }

    @Transactional
    public PartyResponse update(Long id, PartyRequest request) {
        Party party = findOrThrow(id);
        mapRequest(party, request);
        return PartyResponse.from(partyRepository.save(party));
    }

    @Transactional
    public void deactivate(Long id) {
        Party party = findOrThrow(id);
        party.setActive(false);
        partyRepository.save(party);
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
}
