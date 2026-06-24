package com.gap.customer.vaultservice.models;

import com.gap.customer.vaultservice.dto.LookUpDataDTO;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;

import static org.junit.jupiter.api.Assertions.*;

class VaultFeatureToggleTest {

    private VaultFeatureToggle vaultFeatureToggle;

    @Test
    void defaultLookUpValuesAreSet() {
        vaultFeatureToggle = new VaultFeatureToggle();

        assertFalse(vaultFeatureToggle.isBluefinEnabled());
        assertEquals(50, vaultFeatureToggle.getTokenizeTimeout());
        assertFalse(vaultFeatureToggle.isLegacyCloud());
        assertEquals(80, vaultFeatureToggle.getBulkTokenizeTimeout());
        assertEquals(10, vaultFeatureToggle.getAzureDBTimeout());
        assertEquals(2000, vaultFeatureToggle.getBFConnectTimeout());
        assertEquals(5000, vaultFeatureToggle.getBFConPoolTimeout());
        assertFalse(vaultFeatureToggle.isBluefinFor01TEnabled());
    }

    @Test
    void updateLookupMap() {
        vaultFeatureToggle = new VaultFeatureToggle();

        ArrayList<LookUpDataDTO> lookUpData = new ArrayList<>();
        lookUpData.add(LookUpDataDTO.builder().lookupKey("BLUEFIN").lookupValue("true").build());
        lookUpData.add(LookUpDataDTO.builder().lookupKey("LEGACY").lookupValue("true").build());
        lookUpData.add(LookUpDataDTO.builder().lookupKey("AZUREDBTIMEOUT").lookupValue("2000").build());
        lookUpData.add(LookUpDataDTO.builder().lookupKey("TOKENIZETIMEOUT").lookupValue("50").build());
        lookUpData.add(LookUpDataDTO.builder().lookupKey("BULKTOKENIZETIMEOUT").lookupValue("80").build());
        lookUpData.add(LookUpDataDTO.builder().lookupKey("DETOKENIZETIMEOUT").lookupValue("50").build());
        lookUpData.add(LookUpDataDTO.builder().lookupKey("BULKDETOKTIMEOUT").lookupValue("80").build());
        lookUpData.add(LookUpDataDTO.builder().lookupKey("BFCONNECTTIMEOUT").lookupValue("2000").build());
        lookUpData.add(LookUpDataDTO.builder().lookupKey("BFCONPOOLREQTIMEOUT").lookupValue("5000").build());
        lookUpData.add(LookUpDataDTO.builder().lookupKey("BLUEFINFOR01T").lookupValue("true").build());

        vaultFeatureToggle.updateLookupMap(lookUpData);

        assertTrue(vaultFeatureToggle.isBluefinEnabled());
        assertEquals(50, vaultFeatureToggle.getTokenizeTimeout());
        assertTrue(vaultFeatureToggle.isLegacyCloud());
        assertEquals(80, vaultFeatureToggle.getBulkTokenizeTimeout());
        assertEquals(2000, vaultFeatureToggle.getAzureDBTimeout());
        assertEquals(2000, vaultFeatureToggle.getBFConnectTimeout());
        assertEquals(5000, vaultFeatureToggle.getBFConPoolTimeout());
        assertTrue(vaultFeatureToggle.isBluefinFor01TEnabled());
    }
}