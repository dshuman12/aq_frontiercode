package com.gap.customer.vaultservice.dao.Impl;

import com.gap.customer.vaultservice.dto.PasswordResultDTO;
import com.gap.customer.vaultservice.exception.VaultServiceException;
import com.gap.customer.vaultservice.repository.azureSql.PasswordRepository;
import com.gap.customer.vaultservice.config.ResilientTimeLimitterConfig;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.springframework.test.context.junit.jupiter.SpringExtension;

import java.math.BigDecimal;
import java.util.Date;
import java.util.concurrent.TimeoutException;

import static com.gap.customer.vaultservice.util.TimelimterUtils.getAzureTimeLimiter;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(SpringExtension.class)
class PasswordRepositoryDAOImplTest {

    private final String VAULT_ID = "26DD0155DFBB037CCAE71ADBCA67A689";
    private final String HASH_VALUE = "uHPcAxbxJ0PNUeuGy7f9gBBAf1Y=";
    private final byte[] CIPHER_TEXT = {(byte) 323456};
    private final String DATA_TYPE = "GiftCardNumber";
    private final String USER_ID = "TEST";
    private final Date DATE_TIME = new Date();
    private final BigDecimal DATA_TYPE_KEY_ID = new BigDecimal(123);

    @InjectMocks
    private PasswordRepositoryDAOImpl passwordRepositoryDAO;

    @Mock
    private PasswordRepository passwordRepository;

    @Mock
    private ResilientTimeLimitterConfig resilientTimeLimitterConfig;

    @Test
    void shouldGetPasswordByDataTypeAndHashValue() throws VaultServiceException, TimeoutException {
        PasswordResultDTO passwordResultDTO = getPasswordResultDTO();
        when(passwordRepository.getByDataTypeAndHashValue(HASH_VALUE, DATA_TYPE)).thenReturn(passwordResultDTO);
        when(resilientTimeLimitterConfig.getAzureDbTimeLimiter()).thenReturn(getAzureTimeLimiter());

        PasswordResultDTO passwordResult = passwordRepositoryDAO.getByDataTypeAndHashValue(HASH_VALUE, DATA_TYPE);

        assertEquals(passwordResultDTO, passwordResult);
    }

    @Test
    void shouldGetPasswordByVaultId() throws VaultServiceException, TimeoutException {
        PasswordResultDTO passwordResultDTO = getPasswordResultDTO();
        when(passwordRepository.getByVaultId(VAULT_ID)).thenReturn(passwordResultDTO);
        when(resilientTimeLimitterConfig.getAzureDbTimeLimiter()).thenReturn(getAzureTimeLimiter());

        PasswordResultDTO passwordResult = passwordRepositoryDAO.getByVaultId(VAULT_ID);

        assertEquals(passwordResultDTO, passwordResult);
    }

    @Test
    void shouldInsertPassword() {
        when(passwordRepository.insert(anyString(), any(), anyString(), any(), anyString(), any(), anyString(), any())).thenReturn(true);

        Boolean result = passwordRepositoryDAO.insert(VAULT_ID, CIPHER_TEXT, HASH_VALUE, DATA_TYPE_KEY_ID, USER_ID);

        assertTrue(result);
        verify(passwordRepository, times(1))
                .insert(anyString(), any(), anyString(), any(), anyString(), any(), anyString(), any());

    }

    private PasswordResultDTO getPasswordResultDTO() {
        return PasswordResultDTO.builder().vaultId(VAULT_ID)
                .hashValue(HASH_VALUE)
                .cipherText(CIPHER_TEXT)
                .build();
    }
}