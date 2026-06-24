package com.gap.customer.vaultservice.services.Impl;

import com.gap.customer.vaultservice.dto.LookUpDataDTO;
import com.gap.customer.vaultservice.models.LookUpData;
import com.gap.customer.vaultservice.repository.azureSql.LookUpRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.springframework.test.context.junit.jupiter.SpringExtension;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import static com.gap.customer.vaultservice.util.VaultConstants.AZURE_DB_TIMEOUT;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(SpringExtension.class)
class LookUpServiceImplTest {

    @InjectMocks
    private LookUpServiceImpl lookUpService;

    @Mock
    private LookUpRepository lookUpRepository;

    private static final String BLUEFIN = "BLUEFIN";
    private static final String TOKENIZE_TIMEOUT = "50";
    private static final String LEGACY = "LEGACY";
    private static final String TRUE = "true";
    private static final String FALSE = "false";

    @Test
    void shouldUpdateFlag() {
        List<LookUpData> lookUpData = Arrays.asList(LookUpData.builder().lookupKey(BLUEFIN).lookupValue("true").build());
        doNothing().when(lookUpRepository).updateFlag(BLUEFIN, TRUE);

        lookUpService.updateLookUpData(lookUpData);

        verify(lookUpRepository, times(1)).updateFlag(BLUEFIN, TRUE);
    }

    @Test
    void shouldUpdateFlags() {
        LookUpData bluefin = LookUpData.builder().lookupKey(BLUEFIN).lookupValue("true").build();
        LookUpData tokenizeTimeout = LookUpData.builder().lookupKey(TOKENIZE_TIMEOUT).lookupValue("50").build();
        LookUpData legacy = LookUpData.builder().lookupKey(LEGACY).lookupValue("true").build();
        List<LookUpData> lookUpData = new ArrayList<>();
        lookUpData.add(bluefin);
        lookUpData.add(tokenizeTimeout);
        lookUpData.add(legacy);
        doNothing().when(lookUpRepository).updateFlag(anyString(), anyString());

        lookUpService.updateLookUpData(lookUpData);

        verify(lookUpRepository, times(3)).updateFlag(anyString(), anyString());
    }

    @Test
    void shouldUpdateDBFlags() {
        LookUpData azureDBTimeout = LookUpData.builder().lookupKey(AZURE_DB_TIMEOUT).lookupValue("1000").build();
        LookUpData tokenizeTimeout = LookUpData.builder().lookupKey(TOKENIZE_TIMEOUT).lookupValue("60").build();
        List<LookUpData> lookUpData = new ArrayList<>();
        lookUpData.add(azureDBTimeout);
        lookUpData.add(tokenizeTimeout);
        doNothing().when(lookUpRepository).updateFlag(anyString(), anyString());

        lookUpService.updateLookUpData(lookUpData);

        verify(lookUpRepository, times(2)).updateFlag(anyString(), anyString());
    }

    @Test
    void shouldGetLookUpData() {
        List<LookUpDataDTO> lookUpDataDTOS = List.of(LookUpDataDTO.builder().build());
        when(lookUpRepository.findAll()).thenReturn(lookUpDataDTOS);

        List<LookUpDataDTO> actualLookUpData = lookUpService.getLookUpData();

        verify(lookUpRepository).findAll();
        assertEquals(lookUpDataDTOS, actualLookUpData);
    }
}