package com.gap.customer.vaultservice.services.Impl;

import com.gap.customer.vaultservice.dto.LookUpDataDTO;
import com.gap.customer.vaultservice.models.LookUpData;
import com.gap.customer.vaultservice.repository.azureSql.LookUpRepository;
import com.gap.customer.vaultservice.services.LookUpService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class LookUpServiceImpl implements LookUpService {

    private final LookUpRepository lookUpRepository;

    @Override
    public void updateLookUpData(List<LookUpData> lookUpRequestList) {
        log.info("endpoint : /lookUp , request : {}", LookUpData.toMaskedString(lookUpRequestList));
        for(var lookUpRequest : lookUpRequestList) {
            lookUpRepository.updateFlag(lookUpRequest.getLookupKey(), lookUpRequest.getLookupValue());
            log.info("Updated {} flag to {}", lookUpRequest.getLookupKey(), lookUpRequest.getLookupValue());
        }
    }

    @Override
    public List<LookUpDataDTO> getLookUpData() {
        return (List) lookUpRepository.findAll();
    }
}
