package com.gap.customer.vaultservice.scheduler;

import com.gap.customer.vaultservice.dto.LookUpDataDTO;
import com.gap.customer.vaultservice.models.VaultFeatureToggle;
import com.gap.customer.vaultservice.services.LookUpService;
import com.gap.gid.config.RestTemplateConfig;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.springframework.test.context.junit.jupiter.SpringExtension;

import java.util.ArrayList;

import static com.gap.customer.vaultservice.util.VaultConstants.AZURE_DB_TIMEOUT;
import static com.gap.customer.vaultservice.util.VaultConstants.BLUEFIN_FLAG;
import static com.gap.customer.vaultservice.util.VaultConstants.BULK_TOKENIZE_TIMEOUT;
import static com.gap.customer.vaultservice.util.VaultConstants.LEGACY_FLAG;
import static com.gap.customer.vaultservice.util.VaultConstants.TOKENIZE_TIMEOUT;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(SpringExtension.class)
class LookUpSchedulerTest {
    @InjectMocks
    private LookUpScheduler lookUpScheduler;

    @Mock
    private LookUpService lookUpService;

    @Mock
    private VaultFeatureToggle vaultFeatureToggle;

    @Mock
    private RestTemplateConfig restTemplateConfig;

    @Test
    void shouldFetchLookUpData() {
        ArrayList<LookUpDataDTO> lookUpData = new ArrayList<>();
        lookUpData.add(LookUpDataDTO.builder().lookupKey("BLUEFIN").lookupValue("true").build());
        lookUpData.add(LookUpDataDTO.builder().lookupKey("LEGACY").lookupValue("true").build());
        lookUpData.add(LookUpDataDTO.builder().lookupKey("AZUREDBTIMEOUT").lookupValue("2000").build());
        lookUpData.add(LookUpDataDTO.builder().lookupKey("TOKENIZETIMEOUT").lookupValue("50").build());
        lookUpData.add(LookUpDataDTO.builder().lookupKey("BULKTOKENIZETIMEOUT").lookupValue("80").build());
        lookUpData.add(LookUpDataDTO.builder().lookupKey("DETOKENIZETIMEOUT").lookupValue("50").build());
        lookUpData.add(LookUpDataDTO.builder().lookupKey("BULKDETOKTIMEOUT").lookupValue("80").build());
        when(lookUpService.getLookUpData()).thenReturn(lookUpData);
        doNothing().when(restTemplateConfig).updateBlufinTimeout(any(), any(), any(), any());

        lookUpScheduler.fetchLookUpData();

        verify(lookUpService, times(1)).getLookUpData();
        assertEquals("true", vaultFeatureToggle.lookUpMap.get(BLUEFIN_FLAG));
        assertEquals("50", vaultFeatureToggle.lookUpMap.get(TOKENIZE_TIMEOUT));
        assertEquals("true", vaultFeatureToggle.lookUpMap.get(LEGACY_FLAG));
        assertEquals("80", vaultFeatureToggle.lookUpMap.get(BULK_TOKENIZE_TIMEOUT));
        assertEquals("2000", vaultFeatureToggle.lookUpMap.get(AZURE_DB_TIMEOUT));
    }
}