package com.gap.customer.vaultservice.services;

import com.gap.customer.vaultservice.dto.LookUpDataDTO;
import com.gap.customer.vaultservice.models.LookUpData;

import java.util.List;

public interface LookUpService {
    void updateLookUpData(List<LookUpData> lookUpRequest);

    List<LookUpDataDTO> getLookUpData();
}
