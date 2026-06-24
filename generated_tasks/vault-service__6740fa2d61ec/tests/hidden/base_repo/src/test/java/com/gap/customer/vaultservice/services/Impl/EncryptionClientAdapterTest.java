package com.gap.customer.vaultservice.services.Impl;

import com.gap.customer.vaultservice.dao.DAOFacade;
import com.gap.customer.vaultservice.dao.EncryptionRepositoryDAO;
import com.gap.customer.vaultservice.dto.DataTypeKeyDataResultDTO;
import com.gap.customer.vaultservice.dto.EncryptedDataResultDTO;
import com.gap.customer.vaultservice.exception.VaultServiceException;
import com.gap.customer.vaultservice.models.VaultClientRequest;
import com.gap.customer.vaultservice.models.VaultClientResponse;
import com.gap.customer.vaultservice.models.VaultFeatureToggle;
import com.gap.customer.vaultservice.security.CipherHashAlgorithm;
import com.gap.customer.vaultservice.security.DataTypeKeyDataUtil;
import com.gap.customer.vaultservice.util.VaultConstants;
import com.gap.gid.security.adapter.BluefinAdapter;
import com.gap.gid.security.dto.BluefinTokenDTO;
import com.gap.gid.security.exception.BluefinException;
import com.gap.gid.security.exception.BluefinTimeoutException;
import com.gap.gid.security.model.DataType;
import com.google.common.io.BaseEncoding;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.junit.jupiter.SpringExtension;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(SpringExtension.class)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
public class EncryptionClientAdapterTest {


    @Mock
    private EncryptionClientHelper encryptionClientHelper;
    @Mock
    private DataTypeKeyDataUtil dataTypeKeyDataUtil;
    @Mock
    private CipherHashAlgorithm cipherHashAlgorithm;

    @Mock
    private CipherClientAdapter cipherClientAdapter;

    @Mock
    private VaultClientResponseHelper vaultClientResponseHelper;

    @Mock
    private DAOFacade daoFacade;

    @Mock
    private EncryptionRepositoryDAO encryptionRepositoryDAO;

    @Mock
    private BluefinAdapter bluefinAdapter;

    @Mock
    private VaultFeatureToggle vaultFeatureToggle;

    private EncryptionClientAdapter encryptionClientAdapter;

    private final String VAULT_ID = "67347C0B9CD32E8639C587C0F7DD933E";
    private final String GIFT_CARD_DATA_TYPE = "GiftCardNumber";
    private final String GIFT_CARD_PIN_DATA_TYPE = "GiftCardPin";
    private final String PLAIN_TEXT = "4111111111111111111";
    private final String HASH_CODE = "e04fd020ea3a6910a2d808002b30309d";


    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        encryptionClientAdapter = new EncryptionClientAdapter(encryptionClientHelper,
                dataTypeKeyDataUtil, cipherHashAlgorithm, cipherClientAdapter, bluefinAdapter, vaultFeatureToggle);
    }

    @Disabled
    @Test
    public void shouldStoreVaultIdDataForEncryptedDataWhenNotFoundInDB() throws Exception {
        String appName = "test";
        byte[] cipherText = {'1', '2', '3'};
        String hash = "hash1";
        String giftCardNumber = "1230909243248289";
        DataTypeKeyDataResultDTO dataTypeKeyDataResultDTO = DataTypeKeyDataResultDTO.builder().dtektDataTypEcrpKeyId(new BigDecimal(1)).build();
        VaultClientRequest clientRequest = VaultClientRequest.builder().requestFormat(VaultConstants.REQ_TYPE_GIFT_CARD_NUMBER)
                .responseFormat(VaultConstants.DATA_TYPE_VAULT_ID).requestData(new String[]{giftCardNumber}).build();
        when(cipherHashAlgorithm.getHashValue(eq(giftCardNumber), anyString())).thenReturn(hash);
        when(daoFacade.getEncryptionDAOInstance()).thenReturn(encryptionRepositoryDAO);
        when(encryptionRepositoryDAO.getEncryptedDataByDataTypeAndHashValue(eq(hash), anyString())).thenReturn(null);
        when(dataTypeKeyDataUtil.getDataTypeKeyData(anyString())).thenReturn(dataTypeKeyDataResultDTO);
        when(cipherClientAdapter.getEncryptedText(giftCardNumber, dataTypeKeyDataResultDTO)).thenReturn(cipherText);
        doNothing().when(encryptionRepositoryDAO).insertEncryptedData(anyString(), eq(cipherText), eq(hash),
                eq(dataTypeKeyDataResultDTO.getDtektDataTypEcrpKeyId()), eq(appName), any(BluefinTokenDTO.class));

        VaultClientResponse vaultClientResponse = vaultClientResponseHelper.createVaultIdDataForEncryptedCard(clientRequest, appName);

        assertEquals(1, vaultClientResponse.getResult().size());
    }

    @Disabled
    @Test
    public void shouldGetVaultIdForStoreVaultIdDataForGiftCardNumberWhenFoundInDB() throws Exception {
        String appName = "test";
        String hash = "hash1";
        String giftCardNumber = "test123";
        VaultClientRequest clientRequest = VaultClientRequest.builder().requestFormat(VaultConstants.REQ_TYPE_GIFT_CARD_NUMBER)
                .responseFormat(VaultConstants.DATA_TYPE_VAULT_ID).requestData(new String[]{giftCardNumber}).build();
        when(cipherHashAlgorithm.getHashValue(eq(giftCardNumber), anyString())).thenReturn(hash);
        when(daoFacade.getEncryptionDAOInstance()).thenReturn(encryptionRepositoryDAO);
        when(encryptionRepositoryDAO.getEncryptedDataByDataTypeAndHashValue(eq(hash), anyString()))
                .thenReturn(EncryptedDataResultDTO.builder().vaultId("123").build());

        VaultClientResponse vaultClientResponse = vaultClientResponseHelper.createVaultIdDataForEncryptedCard(clientRequest, appName);

        assertEquals(1, vaultClientResponse.getResult().size());
        assertEquals("123", vaultClientResponse.getResult().get(0).getResponseData());
    }

    @Disabled
    @Test
    public void shouldThrowExceptionForStoreVaultIdDataForGiftCardNumberExceptionInDataTypeKeyDataUtil() throws Exception {
        String appName = "test";
        String hash = "hash1";
        String giftCardNumber = "1230909243248289";
        VaultClientRequest clientRequest = VaultClientRequest.builder().requestFormat(VaultConstants.REQ_TYPE_GIFT_CARD_NUMBER)
                .responseFormat(VaultConstants.DATA_TYPE_VAULT_ID).requestData(new String[]{giftCardNumber}).build();
        when(cipherHashAlgorithm.getHashValue(eq(giftCardNumber), anyString())).thenReturn(hash);
        when(daoFacade.getEncryptionDAOInstance()).thenReturn(encryptionRepositoryDAO);
        when(encryptionRepositoryDAO.getEncryptedDataByDataTypeAndHashValue(eq(hash), anyString())).thenReturn(null);
        when(dataTypeKeyDataUtil.getDataTypeKeyData(anyString())).thenThrow(new VaultServiceException("exception"));

        assertThrows(VaultServiceException.class, () -> vaultClientResponseHelper.createVaultIdDataForEncryptedCard(clientRequest, appName));
    }

    @Disabled
    @Test
    public void shouldThrowExceptionForStoreVaultIdDataForGiftCardNumberExceptionWhenCipherTextIsNull() throws Exception {
        String appName = "test";
        String hash = "hash1";
        String giftCardNumber = "1230909243248289";
        DataTypeKeyDataResultDTO dataTypeKeyDataResultDTO = DataTypeKeyDataResultDTO.builder().dtektDataTypEcrpKeyId(new BigDecimal(1)).build();
        VaultClientRequest clientRequest = VaultClientRequest.builder().requestFormat(VaultConstants.REQ_TYPE_GIFT_CARD_NUMBER)
                .responseFormat(VaultConstants.DATA_TYPE_VAULT_ID).requestData(new String[]{giftCardNumber}).build();
        when(cipherHashAlgorithm.getHashValue(eq(giftCardNumber), anyString())).thenReturn(hash);
        when(daoFacade.getEncryptionDAOInstance()).thenReturn(encryptionRepositoryDAO);
        when(encryptionRepositoryDAO.getEncryptedDataByDataTypeAndHashValue(eq(hash), anyString())).thenReturn(null);
        when(dataTypeKeyDataUtil.getDataTypeKeyData(anyString())).thenReturn(dataTypeKeyDataResultDTO);
        when(cipherClientAdapter.getEncryptedText(giftCardNumber, dataTypeKeyDataResultDTO)).thenReturn(null);

        assertThrows(VaultServiceException.class, () -> vaultClientResponseHelper.createVaultIdDataForEncryptedCard(clientRequest, appName));
    }

    @Test
    void shouldRetrievePlainTextForGivenVaultId() throws VaultServiceException {
        EncryptedDataResultDTO encryptedDataResultDTO = EncryptedDataResultDTO.builder()
                .dataType(GIFT_CARD_DATA_TYPE)
                .vaultId(VAULT_ID)
                .cipherText(BaseEncoding.base16().lowerCase().decode(HASH_CODE))
                .dataTypeKeyDataId(new BigDecimal(12))
                .hashValue(HASH_CODE).build();
        DataTypeKeyDataResultDTO dataTypeKeyDataResultDTO = DataTypeKeyDataResultDTO.builder().build();

        when(encryptionClientHelper.getEncryptedDataResultDTO(VAULT_ID)).thenReturn(encryptedDataResultDTO);
        when(dataTypeKeyDataUtil.getDataTypeKeyData(GIFT_CARD_DATA_TYPE)).thenReturn(dataTypeKeyDataResultDTO);
        when(cipherClientAdapter.getDecryptedText(encryptedDataResultDTO.getCipherText(), dataTypeKeyDataResultDTO)).thenReturn(PLAIN_TEXT);

        String actualPlainText = encryptionClientAdapter.retrieve(VAULT_ID, GIFT_CARD_DATA_TYPE);

        assertEquals(PLAIN_TEXT, actualPlainText);
    }

    @Test
    void retrieveShouldThrowDataNotFoundException() throws VaultServiceException {
        EncryptedDataResultDTO encryptedDataResultDTO = EncryptedDataResultDTO.builder()
                .dataType(GIFT_CARD_DATA_TYPE)
                .vaultId(VAULT_ID)
                .cipherText(BaseEncoding.base16().lowerCase().decode(HASH_CODE))
                .dataTypeKeyDataId(new BigDecimal(12))
                .hashValue(HASH_CODE).build();
        when(encryptionClientHelper.getEncryptedDataResultDTO(VAULT_ID)).thenReturn(encryptedDataResultDTO);

        String actualPlainText = encryptionClientAdapter.retrieve(VAULT_ID, GIFT_CARD_PIN_DATA_TYPE);

        assertEquals("NOT_FOUND", actualPlainText);
    }

    @Test
    void shouldReturnVaultIdForStoreWhenEncryptedDataExistsForGivenCleartext() throws VaultServiceException {
        String clearText = "testData";
        String hashText = "testHash";
        when(cipherHashAlgorithm.getHashValue(clearText, GIFT_CARD_DATA_TYPE)).thenReturn(hashText);
        when(encryptionClientHelper.findVaultIdForEncryptedData(hashText, GIFT_CARD_DATA_TYPE))
                .thenReturn(EncryptedDataResultDTO.builder().vaultId(VAULT_ID).bfId("testBfId").bfToken("testBfToken").build());
        String actualVaultId = encryptionClientAdapter.store(clearText, GIFT_CARD_DATA_TYPE, "test");

        verify(cipherHashAlgorithm).getHashValue(clearText, GIFT_CARD_DATA_TYPE);
        verify(encryptionClientHelper).findVaultIdForEncryptedData(hashText, GIFT_CARD_DATA_TYPE);
        verify(encryptionClientHelper, never()).createVaultIDForNullEncryptedData(any(), any(), any(), any(), any());
        verify(encryptionClientHelper, never()).updateBluefinDetails(any(), any(), anyString());
        assertEquals(VAULT_ID, actualVaultId);
    }

    @Test
    void shouldReturnVaultIdForStoreWhenEncryptedDataIsNullForGivenCleartext() throws VaultServiceException, BluefinTimeoutException, BluefinException {
        String clearText = "testData";
        String hashText = "testHash";
        byte[] cipherText = "testCipher".getBytes();
        BluefinTokenDTO tokenDTO = BluefinTokenDTO.builder().token("testToken").bfid("testBfId").build();

        DataTypeKeyDataResultDTO dataTypeKeyDataResultDTO = DataTypeKeyDataResultDTO.builder().build();
        when(cipherHashAlgorithm.getHashValue(clearText, GIFT_CARD_DATA_TYPE)).thenReturn(hashText);
        when(encryptionClientHelper.findVaultIdForEncryptedData(hashText, GIFT_CARD_DATA_TYPE)).thenReturn(null);
        when(dataTypeKeyDataUtil.getDataTypeKeyData(GIFT_CARD_DATA_TYPE))
                .thenReturn(dataTypeKeyDataResultDTO);
        when(cipherClientAdapter.getEncryptedText(clearText, dataTypeKeyDataResultDTO)).thenReturn(cipherText);
        when(bluefinAdapter.tokenize(clearText, DataType.GiftCardNumber)).thenReturn(tokenDTO);
        when(encryptionClientHelper.createVaultIDForNullEncryptedData("test",
                hashText,
                cipherText,
                dataTypeKeyDataResultDTO.getDtektDataTypEcrpKeyId(),
                tokenDTO)
        ).thenReturn(VAULT_ID);
        when(vaultFeatureToggle.isBluefinFor01TEnabled()).thenReturn(true);

        String actualVaultId = encryptionClientAdapter.store(clearText, GIFT_CARD_DATA_TYPE, "test");

        verify(cipherHashAlgorithm).getHashValue(clearText, GIFT_CARD_DATA_TYPE);
        verify(encryptionClientHelper).findVaultIdForEncryptedData(hashText, GIFT_CARD_DATA_TYPE);
        verify(dataTypeKeyDataUtil).getDataTypeKeyData(GIFT_CARD_DATA_TYPE);
        verify(cipherClientAdapter).getEncryptedText(clearText, dataTypeKeyDataResultDTO);
        verify(encryptionClientHelper).createVaultIDForNullEncryptedData(any(), any(), any(), any(), any());
        assertEquals(VAULT_ID, actualVaultId);
    }

    @Test
    void shouldReturnVaultIdForStoreWhenBluefinDataIsNullForGivenCleartext() throws VaultServiceException, BluefinTimeoutException, BluefinException {
        String clearText = "testData";
        String hashText = "testHash";
        String appName = "test";
        BluefinTokenDTO tokenDTO = BluefinTokenDTO.builder().token("testToken").bfid("testBfId").build();
        when(cipherHashAlgorithm.getHashValue(clearText, GIFT_CARD_DATA_TYPE)).thenReturn(hashText);
        when(encryptionClientHelper.findVaultIdForEncryptedData(hashText, GIFT_CARD_DATA_TYPE))
                .thenReturn(EncryptedDataResultDTO.builder().vaultId(VAULT_ID).build());
        when(vaultFeatureToggle.isBluefinFor01TEnabled()).thenReturn(true);
        when(bluefinAdapter.tokenize(clearText, DataType.GiftCardNumber)).thenReturn(tokenDTO);
        doNothing().when(encryptionClientHelper).updateBluefinDetails(VAULT_ID, tokenDTO, appName);
        String actualVaultId = encryptionClientAdapter.store(clearText, GIFT_CARD_DATA_TYPE, appName);

        verify(cipherHashAlgorithm).getHashValue(clearText, GIFT_CARD_DATA_TYPE);
        verify(encryptionClientHelper).findVaultIdForEncryptedData(hashText, GIFT_CARD_DATA_TYPE);
        verify(encryptionClientHelper, never()).createVaultIDForNullEncryptedData(any(), any(), any(), any(), any());
        verify(encryptionClientHelper).updateBluefinDetails(any(), any(), any());
        assertEquals(VAULT_ID, actualVaultId);
    }

    @Test
    void shouldThrowVaultExceptionForStoreWhenBluefinExceptionIsThrown() throws VaultServiceException, BluefinTimeoutException, BluefinException {
        String clearText = "testData";
        String hashText = "testHash";
        String appName = "test";
        when(cipherHashAlgorithm.getHashValue(clearText, GIFT_CARD_DATA_TYPE)).thenReturn(hashText);
        when(encryptionClientHelper.findVaultIdForEncryptedData(hashText, GIFT_CARD_DATA_TYPE))
                .thenReturn(null);
        when(vaultFeatureToggle.isBluefinFor01TEnabled()).thenReturn(true);
        when(bluefinAdapter.tokenize(clearText, DataType.GiftCardNumber)).thenThrow(new BluefinException("bluefin call failed"));

        assertThrows(VaultServiceException.class, () -> encryptionClientAdapter.store(clearText, GIFT_CARD_DATA_TYPE, appName));
    }

    @Test
    void shouldThrowVaultExceptionForStoreWhenBluefinTimeoutExceptionIsThrown() throws VaultServiceException, BluefinTimeoutException, BluefinException {
        String clearText = "testData";
        String hashText = "testHash";
        String appName = "test";
        when(cipherHashAlgorithm.getHashValue(clearText, GIFT_CARD_DATA_TYPE)).thenReturn(hashText);
        when(encryptionClientHelper.findVaultIdForEncryptedData(hashText, GIFT_CARD_DATA_TYPE))
                .thenReturn(EncryptedDataResultDTO.builder().vaultId(VAULT_ID).build());
        when(vaultFeatureToggle.isBluefinFor01TEnabled()).thenReturn(true);
        when(bluefinAdapter.tokenize(clearText, DataType.GiftCardNumber)).thenThrow(new BluefinTimeoutException("bluefin call timeout", new RuntimeException()));

        assertThrows(VaultServiceException.class, () -> encryptionClientAdapter.store(clearText, GIFT_CARD_DATA_TYPE, appName));
    }
}