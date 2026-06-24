package com.gap.customer.vaultservice.models;

import com.gap.customer.vaultservice.dto.LookUpDataDTO;
import com.gap.customer.vaultservice.util.VaultConstants;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static java.lang.Boolean.parseBoolean;
import static java.lang.Integer.parseInt;
import static java.lang.Long.parseLong;

@Component
@Slf4j
public class VaultFeatureToggle {

    private Map<String, String> lookUpMap = new HashMap<>();

    public VaultFeatureToggle() {
        setDefaults();
    }

    public void setDefaults() {
        lookUpMap.put(VaultConstants.BLUEFIN_FLAG, "false");
        lookUpMap.put(VaultConstants.LEGACY_FLAG, "false");
        lookUpMap.put(VaultConstants.AZURE_DB_TIMEOUT, "10");
        lookUpMap.put(VaultConstants.TOKENIZE_TIMEOUT, "50");
        lookUpMap.put(VaultConstants.BULK_TOKENIZE_TIMEOUT, "80");
        lookUpMap.put(VaultConstants.DETOKENIZE_TIMEOUT, "50");
        lookUpMap.put(VaultConstants.BULK_DETOKENIZE_TIMEOUT, "80");
        lookUpMap.put(VaultConstants.BF_CONNECT_TIMEOUT, "2000");
        lookUpMap.put(VaultConstants.BF_CONPOOL_REQTIMEOUT, "5000");
        lookUpMap.put(VaultConstants.BLUEFIN_FOR_01T_FLAG, "false");
    }

    public void updateLookupMap(List<LookUpDataDTO> lookUpDataDTOList) {
        lookUpMap = lookUpDataDTOList.stream()
                .collect(Collectors.toMap(LookUpDataDTO::getLookupKey, LookUpDataDTO::getLookupValue));
    }

    public boolean isLegacyCloud() {
        return parseBoolean(lookUpMap.get(VaultConstants.LEGACY_FLAG));
    }

    public boolean isBluefinEnabled() {
        return parseBoolean(lookUpMap.get(VaultConstants.BLUEFIN_FLAG));
    }

    public long getAzureDBTimeout() {
        return parseLong(lookUpMap.get(VaultConstants.AZURE_DB_TIMEOUT));
    }

    public int getTokenizeTimeout() {
        return parseInt(lookUpMap.get(VaultConstants.TOKENIZE_TIMEOUT));
    }

    public int getBulkTokenizeTimeout() {
        return parseInt(lookUpMap.get(VaultConstants.BULK_TOKENIZE_TIMEOUT));
    }

    public int getDetokenizeTimeout() {
        return parseInt(lookUpMap.get(VaultConstants.DETOKENIZE_TIMEOUT));
    }

    public int getBulkDetokenizeTimeout() {
        return parseInt(lookUpMap.get(VaultConstants.BULK_DETOKENIZE_TIMEOUT));
    }

    public int getBFConnectTimeout() {
        return parseInt(lookUpMap.get(VaultConstants.BF_CONNECT_TIMEOUT));
    }

    public int getBFConPoolTimeout() {
        return parseInt(lookUpMap.get(VaultConstants.BF_CONPOOL_REQTIMEOUT));
    }

    public boolean isBluefinFor01TEnabled() {
        return parseBoolean(lookUpMap.get(VaultConstants.BLUEFIN_FOR_01T_FLAG));
    }
}
