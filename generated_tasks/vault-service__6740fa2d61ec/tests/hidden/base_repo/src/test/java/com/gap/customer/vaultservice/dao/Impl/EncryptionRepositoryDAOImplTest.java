package com.gap.customer.vaultservice.dao.Impl;

import com.gap.customer.vaultservice.config.ResilientTimeLimitterConfig;
import com.gap.customer.vaultservice.dto.EncryptedDataResultDTO;
import com.gap.customer.vaultservice.exception.VaultServiceException;
import com.gap.customer.vaultservice.repository.azureSql.EncryptedDataRepository;
import com.gap.gid.security.dto.BluefinTokenDTO;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.springframework.test.context.junit.jupiter.SpringExtension;

import java.math.BigDecimal;
import java.util.concurrent.TimeoutException;

import static com.gap.customer.vaultservice.util.TimelimterUtils.getAzureTimeLimiter;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(SpringExtension.class)
class EncryptionRepositoryDAOImplTest {

    private final String VAULT_ID = "26DD0155DFBB037CCAE71ADBCA67A689";
    private final String HASH_VALUE = "uHPcAxbxJ0PNUeuGy7f9gBBAf1Y=";
    private final byte[] CIPHER_TEXT = {(byte) 323456};
    private final String DATA_TYPE = "GiftCardNumber";
    private final String USER_ID = "TEST";
    private final BigDecimal DATA_TYPE_KEY_ID = new BigDecimal(123);
    private final String BFTOKEN = "4485861361361655";
    private final String BFID = "A67A68926DD0155DFBB037CCAE71ADBC=";

    @InjectMocks
    private EncryptionRepositoryDAOImpl encryptionRepositoryDAO;

    @Mock
    private EncryptedDataRepository encryptedDataRepository;

    @Mock
    private ResilientTimeLimitterConfig resilientTimeLimitterConfig;

    @Test
    void shouldGetEncryptedDataByDataTypeAndHashValue() throws VaultServiceException, TimeoutException {
        EncryptedDataResultDTO encryptedDataResultDTO = getEncryptedDataResultDTO();
        when(encryptedDataRepository.getEncryptedDataByDataTypeAndHashValue(HASH_VALUE, DATA_TYPE)).thenReturn(encryptedDataResultDTO);
        when(resilientTimeLimitterConfig.getAzureDbTimeLimiter()).thenReturn(getAzureTimeLimiter());

        EncryptedDataResultDTO encryptedData = encryptionRepositoryDAO.getEncryptedDataByDataTypeAndHashValue(HASH_VALUE, DATA_TYPE);

        assertEquals(encryptedDataResultDTO, encryptedData);
    }

    @Test
    void shouldGetEncryptedDataByVaultId() throws VaultServiceException, TimeoutException {
        EncryptedDataResultDTO encryptedDataResultDTO = getEncryptedDataResultDTO();
        when(encryptedDataRepository.getEncryptedDataByVaultId(VAULT_ID)).thenReturn(encryptedDataResultDTO);
        when(resilientTimeLimitterConfig.getAzureDbTimeLimiter()).thenReturn(getAzureTimeLimiter());

        EncryptedDataResultDTO encryptedData = encryptionRepositoryDAO.getEncryptedDataByVaultId(VAULT_ID);

        assertEquals(encryptedDataResultDTO, encryptedData);
    }

    @Test
    void shouldInsertEncryptedData() {
        doNothing().when(encryptedDataRepository)
                .insertEncryptedDataWithBluefin(anyString(), any(), anyString(), any(), anyString(), any(), anyString(), any(), anyString(), anyString());

        BluefinTokenDTO bluefinTokenDTO = BluefinTokenDTO.builder().bfid(BFID).token(BFTOKEN).build();
        encryptionRepositoryDAO.insertEncryptedData(VAULT_ID, CIPHER_TEXT, HASH_VALUE, DATA_TYPE_KEY_ID, USER_ID, bluefinTokenDTO);

        verify(encryptedDataRepository, times(1))
                .insertEncryptedDataWithBluefin(anyString(), any(), anyString(), any(), anyString(), any(), anyString(), any(), anyString(), anyString());
    }

    @Test
    void shouldInsertEncryptedDataWhenBluefinNull() {
        doNothing().when(encryptedDataRepository)
                .insertEncryptedData(anyString(), any(), anyString(), any(), anyString(), any(), anyString(), any());

        encryptionRepositoryDAO.insertEncryptedData(VAULT_ID, CIPHER_TEXT, HASH_VALUE, DATA_TYPE_KEY_ID, USER_ID, null);

        verify(encryptedDataRepository, times(1))
                .insertEncryptedData(anyString(), any(), anyString(), any(), anyString(), any(), anyString(), any());
    }

    @Test
    void shouldUpdateToken() {
        doNothing().when(encryptedDataRepository).updateToken(anyString(), anyString(), anyString(), any(), anyString());
        BluefinTokenDTO tokenDTO = BluefinTokenDTO.builder().bfid(BFID).token(BFTOKEN).build();

        encryptionRepositoryDAO.updateToken(VAULT_ID, tokenDTO, USER_ID);
        verify(encryptedDataRepository, times(1))
                .updateToken(anyString(), anyString(), anyString(), any(), anyString());
    }

    private EncryptedDataResultDTO getEncryptedDataResultDTO() {
        return EncryptedDataResultDTO.builder().vaultId(VAULT_ID)
                .hashValue(HASH_VALUE)
                .dataTypeKeyDataId(new BigDecimal(123))
                .cipherText(CIPHER_TEXT)
                .build();
    }
}