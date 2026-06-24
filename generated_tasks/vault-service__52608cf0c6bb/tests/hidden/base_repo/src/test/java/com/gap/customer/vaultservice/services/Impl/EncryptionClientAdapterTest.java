package com.gap.customer.vaultservice.services.Impl;

import com.gap.customer.vaultservice.dao.DAOFacade;
import com.gap.customer.vaultservice.dao.EncryptionRepositoryDAO;
import com.gap.customer.vaultservice.dto.DataTypeKeyDataResultDTO;
import com.gap.customer.vaultservice.dto.EncryptedDataResultDTO;
import com.gap.customer.vaultservice.exception.VaultServiceException;
import com.gap.customer.vaultservice.models.VaultClientRequest;
import com.gap.customer.vaultservice.models.VaultClientResponse;
import com.gap.customer.vaultservice.models.VaultClientResult;
import com.gap.customer.vaultservice.models.VaultSearchRequest;
import com.gap.customer.vaultservice.repository.azureSql.EncryptedDataRepository;
import com.gap.customer.vaultservice.security.CipherHashAlgorithm;
import com.gap.customer.vaultservice.security.DataTypeKeyDataUtil;
import com.gap.customer.vaultservice.util.VaultConstants;
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
import java.util.ArrayList;
import java.util.List;

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
    private EncryptedDataRepository encryptedDataRepository;

    @Mock
    private CipherClientAdapter cipherClientAdapter;

    @Mock
    private VaultIDFinder vaultIDFinder;

    @Mock
    private VaultClientResponseHelper vaultClientResponseHelper;

    @Mock
    private DAOFacade daoFacade;

    @Mock
    private EncryptionRepositoryDAO encryptionRepositoryDAO;

    private EncryptionClientAdapter encryptionClientAdapter;

    private final String VAULT_ID = "67347C0B9CD32E8639C587C0F7DD933E";
    private final String GIFT_CARD_DATA_TYPE = "GiftCardNumber";
    private final String GIFT_CARD_PIN_DATA_TYPE = "GiftCardPin";
    private final String PLAIN_TEXT = "4111111111111111111";
    private final String HASH_CODE = "e04fd020ea3a6910a2d808002b30309d";


    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        encryptionClientAdapter = new EncryptionClientAdapter(encryptionClientHelper, vaultIDFinder,
                dataTypeKeyDataUtil, cipherHashAlgorithm, cipherClientAdapter);
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
                eq(dataTypeKeyDataResultDTO.getDtektDataTypEcrpKeyId()), eq(appName));

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
        when(vaultIDFinder.findVaultIdForEncryptedData(hashText, GIFT_CARD_DATA_TYPE))
                .thenReturn(VAULT_ID);
        String actualVaultId = encryptionClientAdapter.store(clearText, GIFT_CARD_DATA_TYPE, "test");

        verify(cipherHashAlgorithm).getHashValue(clearText, GIFT_CARD_DATA_TYPE);
        verify(vaultIDFinder).findVaultIdForEncryptedData(hashText, GIFT_CARD_DATA_TYPE);
        verify(encryptionClientHelper, never()).createVaultIDForNullEncryptedData(any(), any(), any(), any());
        assertEquals(VAULT_ID, actualVaultId);
    }

    @Test
    void shouldReturnVaultIdForStoreWhenEncryptedDataIsNullForGivenCleartext() throws VaultServiceException {
        String clearText = "testData";
        String hashText = "testHash";
        byte[] cipherText = "testCipher".getBytes();

        DataTypeKeyDataResultDTO dataTypeKeyDataResultDTO = DataTypeKeyDataResultDTO.builder().build();
        when(cipherHashAlgorithm.getHashValue(clearText, GIFT_CARD_DATA_TYPE)).thenReturn(hashText);
        when(vaultIDFinder.findVaultIdForEncryptedData(hashText, GIFT_CARD_DATA_TYPE)).thenReturn(null);
        when(dataTypeKeyDataUtil.getDataTypeKeyData(GIFT_CARD_DATA_TYPE))
                .thenReturn(dataTypeKeyDataResultDTO);
        when(cipherClientAdapter.getEncryptedText(clearText, dataTypeKeyDataResultDTO)).thenReturn(cipherText);
        when(encryptionClientHelper.createVaultIDForNullEncryptedData("test",
                hashText,
                cipherText,
                dataTypeKeyDataResultDTO.getDtektDataTypEcrpKeyId())
        ).thenReturn(VAULT_ID);

        String actualVaultId = encryptionClientAdapter.store(clearText, GIFT_CARD_DATA_TYPE, "test");

        verify(cipherHashAlgorithm).getHashValue(clearText, GIFT_CARD_DATA_TYPE);
        verify(vaultIDFinder).findVaultIdForEncryptedData(hashText, GIFT_CARD_DATA_TYPE);
        verify(dataTypeKeyDataUtil).getDataTypeKeyData(GIFT_CARD_DATA_TYPE);
        verify(cipherClientAdapter).getEncryptedText(clearText, dataTypeKeyDataResultDTO);
        verify(encryptionClientHelper).createVaultIDForNullEncryptedData(any(), any(), any(), any());
        assertEquals(VAULT_ID, actualVaultId);
    }

    private VaultClientRequest createInvalidVaultClientRequest() {
        List<VaultSearchRequest> vaultRequests = new ArrayList<>();
        VaultSearchRequest vaultRequest1 = VaultSearchRequest.builder()
                .returnType(VaultConstants.DATA_TYPE_GIFT_CARD_NUMBER)
                .index(0)
                .vaultId("4H79")
                .build();

        vaultRequests.add(vaultRequest1);

        VaultClientRequest vaultClientRequest = VaultClientRequest.builder()
                .responseFormat(VaultConstants.DATA_TYPE_GIFT_CARD_NUMBER)
                .requestFormat(VaultConstants.REQ_TYPE_VAULT_ID)
                .requestData(setVaultIdsList(vaultRequests))
                .build();

        return vaultClientRequest;
    }

    private DataTypeKeyDataResultDTO getDataTypeKeyDataResultDTO() {
        return DataTypeKeyDataResultDTO.builder()
                .build();
    }

    private EncryptedDataResultDTO getEncryptedDataResultDTO() {
        return EncryptedDataResultDTO.builder()
                .vaultId("4H7995170925512744799517092551AG")
                .cipherText(new byte[]{1, 2, 3})
                .hashValue("dummyHashValue")
                .dataTypeKeyDataId(new BigDecimal(808409643))
                .build();
    }

    private VaultClientResponse createVaultClientResponse() {
        ArrayList<VaultClientResult> vaultClientResults = new ArrayList<>();

        VaultClientResult vaultClientResult1 = VaultClientResult.builder()
                .requestData("4H7995170925512744799517092551AH")
                .responseData("4479951709255127")
                .build();

        VaultClientResult vaultClientResult2 = VaultClientResult.builder()
                .requestData("4H7995170925512744799517092551AG")
                .responseData("4489951947255128")
                .build();

        vaultClientResults.add(vaultClientResult1);
        vaultClientResults.add(vaultClientResult2);

        VaultClientResponse vaultClientResponse = VaultClientResponse.builder()
                .responseFormat(VaultConstants.DATA_TYPE_GIFT_CARD_NUMBER)
                .requestFormat(VaultConstants.REQ_TYPE_VAULT_ID)
                .result(vaultClientResults)
                .build();

        return vaultClientResponse;
    }

    private VaultClientRequest createValidVaultClientRequest() {
        List<VaultSearchRequest> vaultRequests = new ArrayList<>();
        VaultSearchRequest vaultRequest1 = VaultSearchRequest.builder()
                .returnType(VaultConstants.REQ_TYPE_VAULT_ID)
                .index(0)
                .vaultId("4H7995170925512744799517092551AH")
                .build();

        VaultSearchRequest vaultRequest2 = VaultSearchRequest.builder()
                .returnType(VaultConstants.REQ_TYPE_VAULT_ID)
                .index(1)
                .vaultId("4H7995170925512744799517092551AG")
                .build();

        vaultRequests.add(vaultRequest1);
        vaultRequests.add(vaultRequest2);

        VaultClientRequest vaultClientRequest = VaultClientRequest.builder()
                .responseFormat(VaultConstants.DATA_TYPE_GIFT_CARD_NUMBER)
                .requestFormat(VaultConstants.REQ_TYPE_VAULT_ID)
                .requestData(setVaultIdsList(vaultRequests))
                .build();

        return vaultClientRequest;
    }

    private String[] setVaultIdsList(List<VaultSearchRequest> vaultSearchRequests) {
        return vaultSearchRequests.stream()
                .map(VaultSearchRequest::getVaultId)
                .toArray(String[]::new);
    }
}