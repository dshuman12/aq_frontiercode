package com.gap.customer.vaultservice.services.Impl;

import com.gap.customer.vaultservice.dto.DataTypeKeyDataResultDTO;
import com.gap.customer.vaultservice.dto.PasswordResultDTO;
import com.gap.customer.vaultservice.exception.CipherClientException;
import com.gap.customer.vaultservice.exception.DataNotFoundException;
import com.gap.customer.vaultservice.exception.VaultServiceException;
import com.gap.customer.vaultservice.models.VaultClientRequest;
import com.gap.customer.vaultservice.models.VaultClientResponse;
import com.gap.customer.vaultservice.models.VaultFeatureToggle;
import com.gap.customer.vaultservice.repository.azureSql.PasswordRepository;
import com.gap.customer.vaultservice.security.CipherClientImpl;
import com.gap.customer.vaultservice.security.CipherHashAlgorithm;
import com.gap.customer.vaultservice.security.DataTypeKeyDataUtil;
import com.gap.customer.vaultservice.util.VaultConstants;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.test.context.junit.jupiter.SpringExtension;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(SpringExtension.class)
class PasswordClientAdapterTest {

    @Mock
    private PasswordRepository passwordRespository;

    @Mock
    private PasswordClientHelper passwordClientHelper;

    @Mock
    private DataTypeKeyDataUtil dataTypeKeyDataUtil;

    @Mock
    private CipherHashAlgorithm cipherHashAlgorithm;

    @Mock
    private CipherClientImpl cipherClient;

    @Mock
    private CipherClientAdapter cipherClientAdapter;

    @Mock
    private VaultIDFinder vaultIDFinder;

    @InjectMocks
    private PasswordClientAdapter passwordClientAdapter;

    @Mock
    private VaultClientResponseHelper vaultClientResponseHelper;

    @Mock
    private VaultFeatureToggle vaultFeatureToggle;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        passwordClientAdapter = new PasswordClientAdapter(passwordClientHelper, vaultIDFinder, dataTypeKeyDataUtil, cipherHashAlgorithm, cipherClientAdapter, vaultFeatureToggle);
    }

    @Disabled
    @Test
    public void shouldStoreVaultIdDataForPasswordWhenNotFoundInDB() throws Exception {
        String appName = "test";
        byte[] cipherText = {'1', '2', '3'};
        String hash = "hash1";
        String password = "test123";
        DataTypeKeyDataResultDTO dataTypeKeyDataResultDTO = DataTypeKeyDataResultDTO.builder().dtektDataTypEcrpKeyId(new BigDecimal(1)).build();
        VaultClientRequest clientRequest = VaultClientRequest.builder().requestFormat(VaultConstants.REQ_TYPE_PASSWORD)
                .responseFormat(VaultConstants.DATA_TYPE_VAULT_ID).requestData(new String[]{password}).build();
        when(cipherHashAlgorithm.getHashValue(eq(password), anyString())).thenReturn(hash);
        when(passwordRespository.getByDataTypeAndHashValue(eq(hash), anyString())).thenReturn(null);
        when(dataTypeKeyDataUtil.getDataTypeKeyData(anyString())).thenReturn(dataTypeKeyDataResultDTO);
        when(cipherClient.getCipherText(password, dataTypeKeyDataResultDTO)).thenReturn(cipherText);
        when(passwordRespository.insert(anyString(), eq(cipherText), eq(hash),
                eq(dataTypeKeyDataResultDTO.getDtektDataTypEcrpKeyId()), eq(appName), any(), any(), any())).thenReturn(true);

        VaultClientResponse vaultClientResponse = vaultClientResponseHelper.createVaultIdDataForPassword(clientRequest, appName);

        assertEquals(1, vaultClientResponse.getResult().size());
    }

    @Disabled
    @Test
    public void shouldGetVaultIdForStoreVaultIdDataForPasswordWhenFoundInDB() throws Exception {
        String appName = "test";
        String hash = "hash1";
        String password = "test123";
        VaultClientRequest clientRequest = VaultClientRequest.builder().requestFormat(VaultConstants.REQ_TYPE_PASSWORD)
                .responseFormat(VaultConstants.DATA_TYPE_VAULT_ID).requestData(new String[]{password}).build();
        when(cipherHashAlgorithm.getHashValue(eq(password), anyString())).thenReturn(hash);
        when(passwordRespository.getByDataTypeAndHashValue(eq(hash), anyString())).thenReturn(PasswordResultDTO.builder().vaultId("123").build());

        VaultClientResponse vaultClientResponse = vaultClientResponseHelper.createVaultIdDataForPassword(clientRequest, appName);

        assertEquals(1, vaultClientResponse.getResult().size());
        assertEquals("123", vaultClientResponse.getResult().get(0).getResponseData());
    }

    @Disabled
    @Test
    public void shouldThrowExceptionForStoreVaultIdDataForPasswordExceptionInDataTypeKeyDataUtil() throws Exception {
        String appName = "test";
        String hash = "hash1";
        String password = "test123";
        VaultClientRequest clientRequest = VaultClientRequest.builder().requestFormat(VaultConstants.REQ_TYPE_PASSWORD)
                .responseFormat(VaultConstants.DATA_TYPE_VAULT_ID).requestData(new String[]{password}).build();
        when(cipherHashAlgorithm.getHashValue(eq(password), anyString())).thenReturn(hash);
        when(passwordRespository.getByDataTypeAndHashValue(eq(hash), anyString())).thenReturn(null);
        when(dataTypeKeyDataUtil.getDataTypeKeyData(anyString())).thenThrow(new VaultServiceException("exception"));

        assertThrows(VaultServiceException.class, () -> vaultClientResponseHelper.createVaultIdDataForPassword(clientRequest, appName));
    }

    @Disabled
    @Test
    public void shouldThrowExceptionForStoreVaultIdDataForPasswordExceptionWhenCipherTextIsNull() throws Exception {
        String appName = "test";
        String hash = "hash1";
        String password = "test123";
        DataTypeKeyDataResultDTO dataTypeKeyDataResultDTO = DataTypeKeyDataResultDTO.builder().dtektDataTypEcrpKeyId(new BigDecimal(1)).build();
        VaultClientRequest clientRequest = VaultClientRequest.builder().requestFormat(VaultConstants.REQ_TYPE_PASSWORD)
                .responseFormat(VaultConstants.DATA_TYPE_VAULT_ID).requestData(new String[]{password}).build();
        when(cipherHashAlgorithm.getHashValue(eq(password), anyString())).thenReturn(hash);
        when(passwordRespository.getByDataTypeAndHashValue(eq(hash), anyString())).thenReturn(null);
        when(dataTypeKeyDataUtil.getDataTypeKeyData(anyString())).thenReturn(dataTypeKeyDataResultDTO);
        when(cipherClient.getCipherText(password, dataTypeKeyDataResultDTO)).thenReturn(null);

        assertThrows(VaultServiceException.class, () -> vaultClientResponseHelper.createVaultIdDataForPassword(clientRequest, appName));
    }

    @Disabled
    @Test
    public void shouldThrowExceptionForStoreVaultIdDataForPasswordExceptionWhenInsertQueryThrowsException() throws Exception {
        String appName = "test";
        byte[] cipherText = {'1', '2', '3'};
        String hash = "hash1";
        String password = "test123";
        DataTypeKeyDataResultDTO dataTypeKeyDataResultDTO = DataTypeKeyDataResultDTO.builder().dtektDataTypEcrpKeyId(new BigDecimal(1)).build();
        VaultClientRequest clientRequest = VaultClientRequest.builder().requestFormat(VaultConstants.REQ_TYPE_PASSWORD)
                .responseFormat(VaultConstants.DATA_TYPE_VAULT_ID).requestData(new String[]{password}).build();
        when(cipherHashAlgorithm.getHashValue(eq(password), anyString())).thenReturn(hash);
        when(passwordRespository.getByDataTypeAndHashValue(eq(hash), anyString())).thenReturn(null);
        when(dataTypeKeyDataUtil.getDataTypeKeyData(anyString())).thenReturn(dataTypeKeyDataResultDTO);
        when(cipherClient.getCipherText(password, dataTypeKeyDataResultDTO)).thenReturn(cipherText);
        when(passwordRespository.insert(anyString(), eq(cipherText), eq(hash),
                eq(dataTypeKeyDataResultDTO.getDtektDataTypEcrpKeyId()), eq(appName), any(), any(), any())).thenThrow(new RuntimeException());

        assertThrows(VaultServiceException.class, () -> vaultClientResponseHelper.createVaultIdDataForPassword(clientRequest, appName));
    }

    @Test
    public void shouldReturnClearTextWhenGivenVaultIdAndDataTypeAreValid() throws Exception {
        when(passwordClientHelper.getPasswordDataResultDTO(any())).thenReturn(getValidPasswordDataResultDTO());
        when(cipherClientAdapter.getDecryptedText(any(), any())).thenReturn("clearText");

        String expectedResult = "clearText";
        String actualResult = passwordClientAdapter.retrieve("26DD0155DFBB037CCAE71ADBCA67A689", VaultConstants.DATA_TYPE_PASSWORD);

        assertEquals(expectedResult, actualResult);
    }

    @Test
    public void shouldReturnExceptionWhenVaultIdIsNotPresentInDataBase() throws VaultServiceException {
        when(passwordClientHelper.getPasswordDataResultDTO(any())).thenThrow(new DataNotFoundException());

        assertThrows(VaultServiceException.class, () -> passwordClientAdapter.retrieve("26DD0155DFBB037CCAE71ADBCA67A689", VaultConstants.DATA_TYPE_PASSWORD));
    }

    @Test
    public void shouldThrowVaultServiceExceptionWhenInvalidDataTypeIsGiven() throws Exception {
        when(passwordClientHelper.getPasswordDataResultDTO(any())).thenReturn(getValidPasswordDataResultDTO());
        when(dataTypeKeyDataUtil.getDataTypeKeyData(any())).thenThrow(new VaultServiceException());

        assertThrows(VaultServiceException.class, () -> passwordClientAdapter.retrieve("26DD0155DFBB037CCAE71ADBCA67A689", "datatype"));
    }

    @Test
    public void shouldThrowExceptionWhenClearTextIsNull() throws VaultServiceException {
        when(passwordClientHelper.getPasswordDataResultDTO(any())).thenReturn(getValidPasswordDataResultDTO());
        when(cipherClientAdapter.getDecryptedText(any(), any())).thenThrow(new CipherClientException("Error occured while decrypting the text"));

        assertThrows(VaultServiceException.class, () -> passwordClientAdapter.retrieve("26DD0155DFBB037CCAE71ADBCA67A689", VaultConstants.DATA_TYPE_PASSWORD));
    }

    @Test
    void shouldReturnVaultIdForStoreWhenPasswordDataExistsForGivenCleartext() throws VaultServiceException {
        String clearText = "testData";
        String hashText = "testHash";
        String vaultId = "26DD0155DFBB037CCAE71ADBCA67A689";
        when(cipherHashAlgorithm.getHashValue(clearText, VaultConstants.REQ_TYPE_PASSWORD)).thenReturn(hashText);
        when(vaultIDFinder.findVaultIdForPassword(hashText, VaultConstants.REQ_TYPE_PASSWORD))
                .thenReturn(vaultId);
        String actualVaultId = passwordClientAdapter.store(clearText, VaultConstants.REQ_TYPE_PASSWORD, "test");

        verify(cipherHashAlgorithm).getHashValue(clearText, VaultConstants.REQ_TYPE_PASSWORD);
        verify(vaultIDFinder).findVaultIdForPassword(hashText, VaultConstants.REQ_TYPE_PASSWORD);
        verify(passwordClientHelper, never()).createVaultIDForNullPasswordData(any(), any(), any(), any());
        assertEquals(vaultId, actualVaultId);
    }

    @Test
    void shouldReturnVaultIdForStoreWhenEncryptedDataIsNullForGivenCleartext() throws VaultServiceException {
        String clearText = "testData";
        String hashText = "testHash";
        byte[] cipherText = "testCipher".getBytes();
        String vaultId = "26DD0155DFBB037CCAE71ADBCA67A689";

        DataTypeKeyDataResultDTO dataTypeKeyDataResultDTO = DataTypeKeyDataResultDTO.builder().build();
        when(cipherHashAlgorithm.getHashValue(clearText, VaultConstants.REQ_TYPE_PASSWORD)).thenReturn(hashText);
        when(vaultIDFinder.findVaultIdForPassword(hashText, VaultConstants.REQ_TYPE_PASSWORD)).thenReturn(null);
        when(dataTypeKeyDataUtil.getDataTypeKeyData(VaultConstants.REQ_TYPE_PASSWORD))
                .thenReturn(dataTypeKeyDataResultDTO);
        when(cipherClientAdapter.getEncryptedText(clearText, dataTypeKeyDataResultDTO)).thenReturn(cipherText);
        when(passwordClientHelper.createVaultIDForNullPasswordData("test",
                hashText,
                cipherText,
                dataTypeKeyDataResultDTO.getDtektDataTypEcrpKeyId())
        ).thenReturn(vaultId);

        String actualVaultId = passwordClientAdapter.store(clearText, VaultConstants.REQ_TYPE_PASSWORD, "test");

        verify(cipherHashAlgorithm).getHashValue(clearText, VaultConstants.REQ_TYPE_PASSWORD);
        verify(vaultIDFinder).findVaultIdForPassword(hashText, VaultConstants.REQ_TYPE_PASSWORD);
        verify(dataTypeKeyDataUtil).getDataTypeKeyData(VaultConstants.REQ_TYPE_PASSWORD);
        verify(cipherClientAdapter).getEncryptedText(clearText, dataTypeKeyDataResultDTO);
        verify(passwordClientHelper).createVaultIDForNullPasswordData("test",
                hashText,
                cipherText,
                dataTypeKeyDataResultDTO.getDtektDataTypEcrpKeyId());
        assertEquals(vaultId, actualVaultId);
    }


    private PasswordResultDTO getValidPasswordDataResultDTO() {
        return PasswordResultDTO.builder()
                .cipherText(("cipherText").getBytes())
                .build();
    }

}