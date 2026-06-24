package com.gap.customer.vaultservice.services.Impl;

import com.gap.customer.vaultservice.dao.DAOFacade;
import com.gap.customer.vaultservice.dao.Impl.TokenRepositoryDAOImpl;
import com.gap.customer.vaultservice.dto.TokenDataDTO;
import com.gap.customer.vaultservice.error.ErrorEntityCodes;
import com.gap.customer.vaultservice.exception.VaultServiceException;
import com.gap.customer.vaultservice.models.Token;
import com.gap.customer.vaultservice.models.TokenRequest;
import com.gap.customer.vaultservice.models.VaultClientRequest;
import com.gap.customer.vaultservice.models.VaultClientResponse;
import com.gap.customer.vaultservice.models.VaultClientResult;
import com.gap.customer.vaultservice.models.VaultFeatureToggle;
import com.gap.customer.vaultservice.util.VaultConstants;
import com.gap.gid.security.adapter.BluefinAdapter;
import com.gap.gid.security.adapter.dto.TokenDTO;
import com.gap.gid.security.adapter.voltage.VoltageClient;
import com.gap.gid.security.adapter.voltage.VoltageServiceAdapter;
import com.gap.gid.security.dto.BluefinTokenDTO;
import com.gap.gid.security.dto.DeTokenizeRequestDTO;
import com.gap.gid.security.exception.BluefinException;
import com.gap.gid.security.exception.BluefinTimeoutException;
import com.gap.gid.security.model.DataType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import wiremock.org.apache.commons.lang3.builder.EqualsBuilder;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeoutException;

import static java.util.Arrays.asList;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(SpringExtension.class)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
public class TokenClientAdapterTest {

    @Mock
    private DAOFacade daoFacade;
    @Mock
    private TokenRepositoryDAOImpl tokenRepositoryDAOImpl;
    @Mock
    private BluefinAdapter bluefinAdapter;
    @Mock
    private VoltageClient voltageClient;
    @Mock
    private VoltageServiceAdapter voltageServiceAdapter;
    @Mock
    private VaultClientResponseHelper vaultClientResponseHelper;
    @Mock
    private VaultFeatureToggle vaultFeatureToggle;

    private TokenClientAdapter tokenClientAdapter;

    @BeforeEach
    public void setUp() {
        MockitoAnnotations.openMocks(this);
        tokenClientAdapter = new TokenClientAdapter(daoFacade,
                bluefinAdapter,
                voltageClient,
                voltageServiceAdapter,
                vaultFeatureToggle
        );
    }

    private final String VAULT_ID1 = "0A3C98B7FEE1D56CB991E3E18D6D6170";
    private final String VAULT_ID2 = "C77F3BACA901976D3A99A1818E26C287";
    private final String VOLTAGE_TOKEN1 = "4485867467951655";
    private final String VOLTAGE_TOKEN2 = "6018596782192368";
    private final String BLUEFIN_TOKEN1 = "4485861361361655";
    private final String BLUEFIN_TOKEN2 = "6018592939132368";
    private final String BLUEFIN_ID1 = "djI6MTIwMjIwMjE2MTM0NDMxMTAxMjI5Nzg2NXxiYzVkMDU3YjUwMzkyMDA3N2JkZjBiZmE3ODVhYWU2Znx8fA==";
    private final String BLUEFIN_ID2 = "djI6MTIwMjIwMjE3MDU1MjU5MTAyMTU4NjA3MnxiYzVkMDU3YjUwMzkyMDA3N2JkZjBiZmE3ODVhYWU2Znx8fA==";
    private final String VOLTAGE_TOKEN_FORMAT = "firstsixlastfour";
    private final String PLAINTEXT1 = "ABC";
    private final String PLAINTEXT2 = "DEF";

    @Test
    public void shouldReturnTokenForGivenCreditCardNumber() {
        when(voltageClient.tokenize(any(String.class))).thenReturn("4479953958875127");
        String creditCardNumber = "4479951709255127";
        String expectedResponse = "4479953958875127";

        String token = tokenClientAdapter.getVoltageToken(creditCardNumber);

        assertEquals(expectedResponse, token);
    }

    // @Test
    public void shouldReturnTokensForGivenCreditCardNumbers() throws Exception {
        when(tokenClientAdapter.getVoltageToken(any(String.class))).thenReturn("4479953958875127")
                .thenReturn("4489951583665128");
        VaultClientRequest vaultClientRequest = createVaultClientRequest();
        VaultClientResponse expectedResponse = getVaultClientResponse();

        VaultClientResponse response = vaultClientResponseHelper.createTokenEntriesForCreditCardNumber(vaultClientRequest);

        assertEquals(2, response.getResult().size());
        assertEquals(expectedResponse.getResult().get(0), response.getResult().get(0));
        assertEquals(expectedResponse.getResult().get(1), response.getResult().get(1));
    }

//    @Test
//    public void shouldStoreVaultIdDataForCreditCardWithNewToken() throws Exception {
//        VaultClientRequest vaultClientRequest = VaultClientRequest.builder()
//                .responseFormat(VaultConstants.DATA_TYPE_TOKEN)
//                .requestFormat("CreditCardNumber")
//                .requestData(new String[]{"4479951709255127"})
//                .build();
//        String appName = "test";
//        when(voltageServiceAdapter.getFormat()).thenReturn("firstSixLastFour");
//        when(voltageClient.tokenize(vaultClientRequest.getRequestData()[0])).thenReturn("4479953958875127");
//        when(tokenRepository.findByVoltageToken(anyString())).thenReturn(null);
//        doNothing().when(tokenRepository).createToken(anyString(), eq("firstSixLastFour"),
//                eq(vaultClientRequest.getRequestData()[0]), eq(appName), any(), anyString(), any());
//        when(tokenRepository.findByVaultId(anyString())).thenReturn(Token.builder().vaultId("DUMMYID1").build());
//
//        VaultClientResponse response = tokenClientAdapter.storeVaultIdDataForCreditCard(vaultClientRequest, appName);
//
//        assertEquals(1, response.getResult().size());
//        assertEquals("DUMMYID1", response.getResult().get(0).getResponseData());
//    }

//    @Test
//    public void shouldReturnVaultIdDataForCreditCardWithExistingTokensVaultId() throws Exception {
//        VaultClientRequest vaultClientRequest = VaultClientRequest.builder()
//                .responseFormat(VaultConstants.DATA_TYPE_TOKEN)
//                .requestFormat("CreditCardNumber")
//                .requestData(new String[]{"4479951709255127"})
//                .build();
//        String appName = "test";
//        when(voltageClient.tokenize(vaultClientRequest.getRequestData()[0])).thenReturn("5579953958875129");
//        when(tokenRepository.findByVoltageToken("5579953958875129")).thenReturn(Token.builder().vaultId("DUMMYID1").build());
//
//        VaultClientResponse response = tokenClientAdapter.storeVaultIdDataForCreditCard(vaultClientRequest, appName);
//
//        assertEquals(1, response.getResult().size());
//        assertEquals("DUMMYID1", response.getResult().get(0).getResponseData());
//    }

//    @Test
//    public void retrieveShouldReturnVaultIdForGivenToken() throws VaultServiceException {
//        when(tokenRepository.findByVoltageToken(anyString())).thenReturn(Token.builder().vaultId("5182169FDDEBDEFDAA307E5948B502DA").build());
//        String expectedResponse = "5182169FDDEBDEFDAA307E5948B502DA";
//        String actualResponse = tokenClientAdapter.retrieve("4479951709255127", "VaultId", "appName");
//        assertEquals(expectedResponse, actualResponse);
//    }


//    @Test
//    public void retrieveShouldReturnVaultIdForGivenTokenWhenNotFoundInVoltageToken() throws VaultServiceException {
//        when(tokenRepository.findByVoltageToken(anyString())).thenReturn(null);
//        doNothing().when(tokenRepository).createToken(anyString(), anyString(), any(), any(), any(), any(), any(), anyString(), anyString());
//        when(tokenRepository.findByVaultId(anyString())).thenReturn(Token.builder().vaultId("5182169FDDEBDEFDAA307E5948B502DA").build());
//
//        String expectedResponse = "5182169FDDEBDEFDAA307E5948B502DA";
//        String actualResponse = tokenClientAdapter.retrieve("4479951709255127", "VaultId", "appName");
//        assertEquals(expectedResponse, actualResponse);
//    }

    @Test
    void shouldStoreBothVoltageAndBluefinTokensForAGivenCreditCardNumber() throws BluefinException, VaultServiceException, TimeoutException, BluefinTimeoutException {
        BluefinTokenDTO bluefinTokenDTO = BluefinTokenDTO.builder()
                .token("8879952618035155")
                .bfid("djI6MTIwMjIwMjE1MDg0NDIyMTAzMzk4MTYxMHxiYzVkMDU3YjUwMzkyMDA3N2JkZjBiZmE3ODVhYWU2Znx8fA==")
                .build();
        Token token = Token.builder().vaultId("3CFB3DFA5995CC7681699A692479C047").bluefinToken("8879952618035155").
                voltageToken("8879956502575155").build();
        List<String> creditCardNumbers = new ArrayList<>();
        creditCardNumbers.add("8879952138765155");
        when(vaultFeatureToggle.isBluefinEnabled()).thenReturn(true);
        when(voltageClient.tokenize(anyString())).thenReturn("8879956502575155");
        when(bluefinAdapter.tokenize(anyString(), any())).thenReturn(bluefinTokenDTO);
        when(daoFacade.getTokenDAOInstance()).thenReturn(tokenRepositoryDAOImpl);
        when(daoFacade.getTokenDAOInstance().findByVoltageToken(anyString())).thenReturn(null);
        doNothing().when(tokenRepositoryDAOImpl).createToken(any(Token.class));
        when(daoFacade.getTokenDAOInstance().findByVaultId(anyString())).thenReturn(token);

        List<TokenDataDTO> tokenDataDTOS = tokenClientAdapter.store(creditCardNumbers, "UNAUTHENTICATED");

        assertEquals("3CFB3DFA5995CC7681699A692479C047", tokenDataDTOS.get(0).getVaultId());
        assertEquals("8879956502575155", tokenDataDTOS.get(0).getVoltageToken());
        assertEquals("8879952618035155", tokenDataDTOS.get(0).getBluefinToken());
    }

    @Test
    @Disabled
    void shouldStoreOnlyVoltageTokenForGivenCreditCardNumber() throws VaultServiceException, TimeoutException {
        TokenDataDTO tokenDataDTO = TokenDataDTO.builder().voltageToken(VOLTAGE_TOKEN1).plaintext(PLAINTEXT1).vaultId(VAULT_ID1).build();
        List<TokenDataDTO> expectedResult = asList(tokenDataDTO);
        Token token = Token.builder().vaultId(VAULT_ID1).voltageToken(VOLTAGE_TOKEN1).build();
        List<String> creditCardNumbers = new ArrayList<>();
        creditCardNumbers.add(PLAINTEXT1);
        when(voltageClient.tokenize(PLAINTEXT1)).thenReturn(VOLTAGE_TOKEN1);
        when(daoFacade.getTokenDAOInstance()).thenReturn(tokenRepositoryDAOImpl);
        when(daoFacade.getTokenDAOInstance().findByVoltageTokenWithoutBluefin(anyString())).thenReturn(null);
        doNothing().when(tokenRepositoryDAOImpl).createToken(any(Token.class));
        when(daoFacade.getTokenDAOInstance().findByVaultId(anyString())).thenReturn(token);

        List<TokenDataDTO> actualResult = tokenClientAdapter.store(creditCardNumbers, "UNAUTHENTICATED");

        assertTrue(EqualsBuilder.reflectionEquals(expectedResult.get(0), actualResult.get(0)));
    }

    @Test
    void shouldUpdateBluefinTokenAndBluefinIdWhenVoltageTokenIsPresentForAGivenCreditCardNumber() throws BluefinException, VaultServiceException, TimeoutException, BluefinTimeoutException {
        BluefinTokenDTO bluefinTokenDTO = BluefinTokenDTO.builder()
                .token("8879952618035155")
                .bfid("djI6MTIwMjIwMjE1MDg0NDIyMTAzMzk4MTYxMHxiYzVkMDU3YjUwMzkyMDA3N2JkZjBiZmE3ODVhYWU2Znx8fA==")
                .build();
        Token token = Token.builder().vaultId("3CFB3DFA5995CC7681699A692479C047").voltageToken("8879956502575155").build();
        List<String> creditCardNumbers = new ArrayList<>();
        creditCardNumbers.add("8879952138765155");
        when(vaultFeatureToggle.isBluefinEnabled()).thenReturn(true);
        when(voltageClient.tokenize(anyString())).thenReturn("8879956502575155");
        when(bluefinAdapter.tokenize(anyString(), any())).thenReturn(bluefinTokenDTO);
        when(daoFacade.getTokenDAOInstance()).thenReturn(tokenRepositoryDAOImpl);
        when(daoFacade.getTokenDAOInstance().findByVoltageToken(anyString())).thenReturn(token);
        doNothing().when(tokenRepositoryDAOImpl).updateToken(anyString(), any(BluefinTokenDTO.class), anyString());

        List<TokenDataDTO> tokenDataDTOS = tokenClientAdapter.store(creditCardNumbers, "UNAUTHENTICATED");

        assertEquals("3CFB3DFA5995CC7681699A692479C047", tokenDataDTOS.get(0).getVaultId());
        assertEquals("8879956502575155", tokenDataDTOS.get(0).getVoltageToken());
        assertEquals("8879952618035155", tokenDataDTOS.get(0).getBluefinToken());
    }

    @Test
    void shouldInsertBluefinAndVoltageTokensForMultipleCreditCards() throws BluefinException, VaultServiceException, TimeoutException, BluefinTimeoutException {
        List<String> creditCardNumbers = new ArrayList<>();
        creditCardNumbers.add("411111111111111");
        creditCardNumbers.add("411111111111112");
        List<BluefinTokenDTO> bluefinTokenDTOList = new ArrayList<>();
        bluefinTokenDTOList.add(BluefinTokenDTO.builder()
                .token("411111921191111")
                .bfid("djI6MTIwMjIwMjE1MDg0NDIyMTAzMzk4MTYxMHxiYzVkMDU3YjUwMzkyMDA3N2JkZjBiZmE3ODVhYWU2Znx8fA==")
                .build());
        bluefinTokenDTOList.add(BluefinTokenDTO.builder()
                .token("411111921191112")
                .bfid("djI6MTIwMjIwMjE1MDg0NDIyMTAzMzk4MTYxMHxiYzVkMDU3YjUwMzkyMDA3N2JkZjBiZmE3ODVhYWU2Znx8fB==")
                .build());
        Token token1 = Token.builder().vaultId("3CFB3DFA5995CC7681699A692479C047").bluefinToken("411111921191111").
                voltageToken("411111902801111").build();
        Token token2 = Token.builder().vaultId("3DFB3DFA5995CC7681699A692479C048").bluefinToken("411111921191112").
                voltageToken("411111973431112").build();
        when(voltageClient.tokenize(anyString())).thenReturn("411111902801111").thenReturn("411111973431112");
        when(bluefinAdapter.tokenize(anyList(), any())).thenReturn(bluefinTokenDTOList);
        when(daoFacade.getTokenDAOInstance()).thenReturn(tokenRepositoryDAOImpl);
        when(daoFacade.getTokenDAOInstance().findByVoltageToken(anyString())).thenReturn(null);
        doNothing().when(tokenRepositoryDAOImpl).createToken(any(Token.class));
        when(daoFacade.getTokenDAOInstance().findByVaultId(anyString())).thenReturn(token1).thenReturn(token2);

        List<TokenDataDTO> tokenDataDTOS = tokenClientAdapter.store(creditCardNumbers, "UNAUTHENTICATED");

        assertEquals(2, tokenDataDTOS.size());
        assertEquals("3CFB3DFA5995CC7681699A692479C047", tokenDataDTOS.get(0).getVaultId());
        assertEquals("3DFB3DFA5995CC7681699A692479C048", tokenDataDTOS.get(1).getVaultId());
    }

    @Test
    @Disabled
    void shouldInsertVoltageTokenForMultipleCreditCards() throws VaultServiceException, TimeoutException {
        List<String> creditCardNumbers = new ArrayList<>();
        List<TokenDataDTO> expectedResult = new ArrayList<>();
        expectedResult.add(TokenDataDTO.builder().plaintext(PLAINTEXT1).voltageToken(VOLTAGE_TOKEN1).vaultId(VAULT_ID1).build());
        expectedResult.add(TokenDataDTO.builder().plaintext(PLAINTEXT2).voltageToken(VOLTAGE_TOKEN2).vaultId(VAULT_ID2).build());
        creditCardNumbers.add(PLAINTEXT1);
        creditCardNumbers.add(PLAINTEXT2);
        Token token1 = Token.builder().vaultId(VAULT_ID1).voltageToken(VOLTAGE_TOKEN1).build();
        Token token2 = Token.builder().vaultId(VAULT_ID2).voltageToken(VOLTAGE_TOKEN2).build();
        when(voltageClient.tokenize(anyString())).thenReturn(VOLTAGE_TOKEN1).thenReturn(VOLTAGE_TOKEN2);
        when(daoFacade.getTokenDAOInstance()).thenReturn(tokenRepositoryDAOImpl);
        when(daoFacade.getTokenDAOInstance().findByVoltageTokenWithoutBluefin(anyString())).thenReturn(null);
        doNothing().when(tokenRepositoryDAOImpl).createToken(any(Token.class));
        when(daoFacade.getTokenDAOInstance().findByVaultId(anyString())).thenReturn(token1).thenReturn(token2);

        List<TokenDataDTO> actualResult = tokenClientAdapter.store(creditCardNumbers, "UNAUTHENTICATED");
        assertEquals(expectedResult.get(0).getVoltageToken(), actualResult.get(0).getVoltageToken());
        assertEquals(expectedResult.get(1).getVoltageToken(), actualResult.get(1).getVoltageToken());
        assertEquals(expectedResult.get(0).getVaultId(), actualResult.get(0).getVaultId());
        assertEquals(expectedResult.get(1).getVaultId(), actualResult.get(1).getVaultId());
        assertTrue(EqualsBuilder.reflectionEquals(expectedResult, actualResult));
    }

    @Test
    public void shouldReturnListOfTokenDataDTOsAndDoNotUpdateBluefinInfoInDBForRetrieveTokensForWhenListOfVaultIdsAreMoreThanOne() throws VaultServiceException, TimeoutException {
        String[] vaultIds = {VAULT_ID1, VAULT_ID2};
        when(vaultFeatureToggle.isBluefinEnabled()).thenReturn(true);
        when(daoFacade.getTokenDAOInstance()).thenReturn(tokenRepositoryDAOImpl);
        when(daoFacade.getTokenDAOInstance().findByVaultId(anyString()))
                .thenReturn(getTokenFor(VAULT_ID1, VOLTAGE_TOKEN1, BLUEFIN_TOKEN1, BLUEFIN_ID1))
                .thenReturn(getTokenFor(VAULT_ID2, VOLTAGE_TOKEN2, BLUEFIN_TOKEN2, BLUEFIN_ID2));
        List<TokenDataDTO> expectedResponse = getTokenDataDTOs();
        List<TokenDataDTO> actualResponse = tokenClientAdapter.retrieveTokensFor(vaultIds, "");

        assertEquals(expectedResponse.size(), actualResponse.size());
        assertEquals(expectedResponse.get(0).getVoltageToken(), actualResponse.get(0).getVoltageToken());
        assertEquals(expectedResponse.get(1).getVoltageToken(), actualResponse.get(1).getVoltageToken());
        verify(daoFacade.getTokenDAOInstance(), never()).updateToken(anyString(), any(BluefinTokenDTO.class), anyString());
    }

    @Test
    void shouldReturnTokenDataDTOsForGivenVaultIdsWhenBluefinIsDisabled() throws VaultServiceException, TimeoutException {
        String[] vaultIds = {VAULT_ID1, VAULT_ID2};
        when(daoFacade.getTokenDAOInstance()).thenReturn(tokenRepositoryDAOImpl);
        when(daoFacade.getTokenDAOInstance().findByVaultId(anyString()))
                .thenReturn(getTokenFor(VAULT_ID1, VOLTAGE_TOKEN1, null, null))
                .thenReturn(getTokenFor(VAULT_ID2, VOLTAGE_TOKEN2, null, null));
        TokenDataDTO tokenDataDTO1 = getTokenDataDTOFor(VOLTAGE_TOKEN1, null, VAULT_ID1, null);
        TokenDataDTO tokenDataDTO2 = getTokenDataDTOFor(VOLTAGE_TOKEN2, null, VAULT_ID2, null);
        List<TokenDataDTO> actualResponse = tokenClientAdapter.retrieveTokensFor(vaultIds, "");

        assertEquals(2, actualResponse.size());
        assertEquals(tokenDataDTO1.getVoltageToken(), actualResponse.get(0).getVoltageToken());
        assertEquals(tokenDataDTO2.getVoltageToken(), actualResponse.get(1).getVoltageToken());
        verify(daoFacade.getTokenDAOInstance(), never()).updateToken(anyString(), any(BluefinTokenDTO.class), anyString());
    }

    @Test
    public void shouldReturnNullTokenInformationAndUpdateBluefinInfoInDBForRetrieveTokensForWhenThereAreNotFoundElementsInGivenVaultIds() throws BluefinException, VaultServiceException, TimeoutException, BluefinTimeoutException {
        String[] vaultIds = {VAULT_ID1, "invalidVaultId"};
        Token token = getTokenFor(VAULT_ID1, VOLTAGE_TOKEN1, null, null);
        BluefinTokenDTO bluefinTokenDTO = getBluefinTokenDTOFor(PLAINTEXT1, BLUEFIN_TOKEN1, BLUEFIN_ID1);
        TokenDataDTO tokenDataDTO = getTokenDataDTOFor(VOLTAGE_TOKEN1, BLUEFIN_TOKEN1, VAULT_ID1, BLUEFIN_ID1);

        when(vaultFeatureToggle.isBluefinEnabled()).thenReturn(true);
        when(daoFacade.getTokenDAOInstance()).thenReturn(tokenRepositoryDAOImpl);
        when(daoFacade.getTokenDAOInstance().findByVaultId(anyString())).thenReturn(token).thenReturn(null);
        when(voltageServiceAdapter.getFormat()).thenReturn(VOLTAGE_TOKEN_FORMAT);
        when(voltageClient.deTokenize(any(TokenDTO.class))).thenReturn(PLAINTEXT1);
        when(bluefinAdapter.tokenize(anyString(), any())).thenReturn(bluefinTokenDTO);
        doNothing().when(tokenRepositoryDAOImpl)
                .updateToken(anyString(), any(BluefinTokenDTO.class), anyString());

        List<TokenDataDTO> actualResponse = tokenClientAdapter.retrieveTokensFor(vaultIds, "");

        assertEquals(tokenDataDTO.getVoltageToken(), actualResponse.get(0).getVoltageToken());
        assertNull(actualResponse.get(1).getVoltageToken());
        verify(daoFacade.getTokenDAOInstance()).updateToken(anyString(), any(BluefinTokenDTO.class), anyString());
    }

    @Test
    public void shouldThrowVaultServiceExceptionForRetrieveTokensForWhenThereIsBluefinExceptionForGivenVaultIds() throws BluefinException, VaultServiceException, TimeoutException, BluefinTimeoutException {
        String[] vaultIds = {VAULT_ID1, VAULT_ID2};
        when(vaultFeatureToggle.isBluefinEnabled()).thenReturn(true);
        when(daoFacade.getTokenDAOInstance()).thenReturn(tokenRepositoryDAOImpl);
        when(daoFacade.getTokenDAOInstance().findByVaultId(anyString())).
                thenReturn(getTokenFor(VAULT_ID1, VOLTAGE_TOKEN1, null, null)).
                thenReturn(getTokenFor(VAULT_ID2, VOLTAGE_TOKEN2, null, null));
        when(voltageServiceAdapter.getFormat()).thenReturn(VOLTAGE_TOKEN_FORMAT);
        when(voltageClient.deTokenize(any(TokenDTO.class))).thenReturn(PLAINTEXT1).thenReturn(PLAINTEXT2);
        when(bluefinAdapter.tokenize(anyList(), any())).thenThrow(new BluefinException("Unable to tokenize given data"));

        VaultServiceException actualException = assertThrows(VaultServiceException.class, () ->
                tokenClientAdapter.retrieveTokensFor(vaultIds, ""));

        assertEquals(ErrorEntityCodes.BLUEFIN_TOKENIZE_EXECPTION, actualException.getMessage());
    }

    @Test
    public void shouldReturnListOfTokenDataDTOsAndUpdateBluefinInfoInDBForRetrieveTokensForWhenListOfVaultIdsHaveOneElement() throws BluefinException, VaultServiceException, TimeoutException, BluefinTimeoutException {
        String[] vaultIds = {VAULT_ID1};
        BluefinTokenDTO bluefinTokenDTO = getBluefinTokenDTOFor(PLAINTEXT1, BLUEFIN_TOKEN1, BLUEFIN_ID1);
        TokenDataDTO tokenDataDTO = getTokenDataDTOFor(VOLTAGE_TOKEN1, BLUEFIN_TOKEN1, VAULT_ID1, BLUEFIN_ID1);
        Token token = getTokenFor(VAULT_ID1, VOLTAGE_TOKEN1, null, null);

        when(vaultFeatureToggle.isBluefinEnabled()).thenReturn(true);
        when(daoFacade.getTokenDAOInstance()).thenReturn(tokenRepositoryDAOImpl);
        when(daoFacade.getTokenDAOInstance().findByVaultId(anyString())).thenReturn(token);
        when(voltageServiceAdapter.getFormat()).thenReturn(VOLTAGE_TOKEN_FORMAT);
        when(voltageClient.deTokenize(any(TokenDTO.class))).thenReturn(PLAINTEXT1);
        when(bluefinAdapter.tokenize(anyString(), any())).thenReturn(bluefinTokenDTO);
        doNothing().when(tokenRepositoryDAOImpl)
                .updateToken(anyString(), any(BluefinTokenDTO.class), anyString());

        List<TokenDataDTO> expectedResponse = List.of(tokenDataDTO);
        List<TokenDataDTO> actualResponse = tokenClientAdapter.retrieveTokensFor(vaultIds, "");

        assertEquals(expectedResponse.size(), actualResponse.size());
        assertEquals(expectedResponse.get(0).getVoltageToken(), actualResponse.get(0).getVoltageToken());
        verify(daoFacade.getTokenDAOInstance()).updateToken(anyString(), any(BluefinTokenDTO.class), anyString());
    }

    @Test
    public void shouldReturnListOfTokenDataDTOsAndDoNotUpdateBluefinInfoInDBForRetrieveTokensForWhenListOfVaultIdsHaveOneElement() throws BluefinException, VaultServiceException, TimeoutException, BluefinTimeoutException {
        String[] vaultIds = {VAULT_ID1};
        BluefinTokenDTO bluefinTokenDTO = getBluefinTokenDTOFor(PLAINTEXT1, BLUEFIN_TOKEN1, BLUEFIN_ID1);
        TokenDataDTO tokenDataDTO = getTokenDataDTOFor(VOLTAGE_TOKEN1, BLUEFIN_TOKEN1, VAULT_ID1, BLUEFIN_ID1);
        Token token = getTokenFor(VAULT_ID1, VOLTAGE_TOKEN1, BLUEFIN_TOKEN1, BLUEFIN_ID1);

        when(vaultFeatureToggle.isBluefinEnabled()).thenReturn(true);
        when(daoFacade.getTokenDAOInstance()).thenReturn(tokenRepositoryDAOImpl);
        when(daoFacade.getTokenDAOInstance().findByVaultId(anyString())).thenReturn(token);
        when(voltageServiceAdapter.getFormat()).thenReturn(VOLTAGE_TOKEN_FORMAT);
        when(voltageClient.deTokenize(any(TokenDTO.class))).thenReturn(PLAINTEXT1);
        when(bluefinAdapter.tokenize(anyString(), any())).thenReturn(bluefinTokenDTO);

        List<TokenDataDTO> expectedResponse = List.of(tokenDataDTO);
        List<TokenDataDTO> actualResponse = tokenClientAdapter.retrieveTokensFor(vaultIds, "");

        assertEquals(expectedResponse.size(), actualResponse.size());
        assertEquals(expectedResponse.get(0).getVoltageToken(), actualResponse.get(0).getVoltageToken());
        verify(daoFacade.getTokenDAOInstance(), never()).updateToken(anyString(), any(BluefinTokenDTO.class), anyString());
    }


    @Test
    public void shouldReturnNullTokenInformationForRetrieveTokensForWhenGivenVauldIdsHaveOneElementAndGivenVaultIdIsNotFound() throws VaultServiceException, TimeoutException {
        String[] vaultIds = {"invalidVaultId"};
        when(daoFacade.getTokenDAOInstance()).thenReturn(tokenRepositoryDAOImpl);
        when(daoFacade.getTokenDAOInstance().findByVaultId(anyString())).thenReturn(null);

        List<TokenDataDTO> actualResponse = tokenClientAdapter.retrieveTokensFor(vaultIds, "");

        assertNull(actualResponse.get(0).getVoltageToken());
    }

    @Test
    public void shouldThrowVaultServiceExceptionForRetrieveTokensForWhenThereIsBluefinExceptionAndGivenVaultIdsHaveOneElement() throws BluefinException, VaultServiceException, TimeoutException, BluefinTimeoutException {
        String[] vaultIds = {VAULT_ID1};
        when(vaultFeatureToggle.isBluefinEnabled()).thenReturn(true);
        when(daoFacade.getTokenDAOInstance()).thenReturn(tokenRepositoryDAOImpl);
        when(daoFacade.getTokenDAOInstance().findByVaultId(anyString())).
                thenReturn(getTokenFor(VAULT_ID1, VOLTAGE_TOKEN1, null, null));
        when(voltageServiceAdapter.getFormat()).thenReturn(VOLTAGE_TOKEN_FORMAT);
        when(voltageClient.deTokenize(any(TokenDTO.class))).thenReturn(PLAINTEXT1);
        when(bluefinAdapter.tokenize(anyString(), any())).thenThrow(new BluefinException("Unable to tokenize given data"));

        VaultServiceException actualException = assertThrows(VaultServiceException.class, () ->
                tokenClientAdapter.retrieveTokensFor(vaultIds, ""));

        assertEquals(ErrorEntityCodes.BLUEFIN_TOKENIZE_EXECPTION, actualException.getMessage());
    }

    @Test
    public void shouldReturnEmptyTokenDataDTOsForRetrieveTokensForWhenEmptyListOfVaultIdsAreGiven() throws VaultServiceException {
        String[] vaultIds = {};
        List<TokenDataDTO> actualResponse = tokenClientAdapter.retrieveTokensFor(vaultIds, "");

        assertEquals(0, actualResponse.size());
    }

    @Test
    public void shouldRetrieveVaultIdsForVoltageTokenDTO() throws Exception {
        TokenDataDTO inputTokenDataDTO = getTokenDataDTOFor(VOLTAGE_TOKEN1, null, null, null);
        Token token = getTokenFor(VAULT_ID1, VOLTAGE_TOKEN1, BLUEFIN_TOKEN1, BLUEFIN_ID1);
        when(daoFacade.getTokenDAOInstance()).thenReturn(tokenRepositoryDAOImpl);
        when(daoFacade.getTokenDAOInstance().findByVoltageToken(anyString())).thenReturn(token);
        when(vaultFeatureToggle.isBluefinEnabled()).thenReturn(true);

        List<TokenDataDTO> tokenDataDTOList = tokenClientAdapter.retrieveVaultIdsFor(List.of(inputTokenDataDTO), "");

        assertNotNull(tokenDataDTOList);
        assertEquals(1, tokenDataDTOList.size());
        TokenDataDTO actualTokenDataDTO = tokenDataDTOList.get(0);
        assertEquals(VAULT_ID1, actualTokenDataDTO.getVaultId());
        assertEquals(VOLTAGE_TOKEN1, actualTokenDataDTO.getVoltageToken());
        assertEquals(BLUEFIN_TOKEN1, actualTokenDataDTO.getBluefinToken());
        assertEquals(BLUEFIN_ID1, actualTokenDataDTO.getBluefinId());
    }

    @Test
    public void shouldPersistAndRetrieveVaultIdsForVoltageTokenDTOWhenBluefinIsEnabled() throws Exception {
        TokenDataDTO inputTokenDataDTO = getTokenDataDTOFor(VOLTAGE_TOKEN1, null, null, null);
        Token token = getTokenFor(VAULT_ID1, VOLTAGE_TOKEN1, BLUEFIN_TOKEN1, BLUEFIN_ID1);
        BluefinTokenDTO bluefinTokenDTO = getBluefinTokenDTOFor(PLAINTEXT1, BLUEFIN_TOKEN1, BLUEFIN_ID1);
        when(vaultFeatureToggle.isBluefinEnabled()).thenReturn(true);
        when(daoFacade.getTokenDAOInstance()).thenReturn(tokenRepositoryDAOImpl);
        when(daoFacade.getTokenDAOInstance().findByVoltageToken(anyString())).thenReturn(null);
        when(voltageClient.deTokenize(any(TokenDTO.class))).thenReturn(PLAINTEXT1);
        when(bluefinAdapter.tokenize(PLAINTEXT1, DataType.CreditCardNumber)).thenReturn(bluefinTokenDTO);
        doNothing().when(tokenRepositoryDAOImpl)
                .createToken(any(Token.class));
        when(daoFacade.getTokenDAOInstance().findByVaultId(anyString())).thenReturn(token);

        List<TokenDataDTO> tokenDataDTOList = tokenClientAdapter.retrieveVaultIdsFor(List.of(inputTokenDataDTO), "");

        assertNotNull(tokenDataDTOList);
        assertEquals(1, tokenDataDTOList.size());
        TokenDataDTO actualTokenDataDTO = tokenDataDTOList.get(0);
        assertEquals(VAULT_ID1, actualTokenDataDTO.getVaultId());
        assertEquals(VOLTAGE_TOKEN1, actualTokenDataDTO.getVoltageToken());
        assertEquals(BLUEFIN_TOKEN1, actualTokenDataDTO.getBluefinToken());
        assertEquals(BLUEFIN_ID1, actualTokenDataDTO.getBluefinId());
    }

    @Test
    @Disabled
    public void shouldPersistAndRetrieveVaultIdsForVoltageTokenDTOWhenBluefinIsDisabled() throws Exception {
        TokenDataDTO inputTokenDataDTO = getTokenDataDTOFor(VOLTAGE_TOKEN1, null, null, null);
        Token token = getTokenFor(VAULT_ID1, VOLTAGE_TOKEN1, BLUEFIN_TOKEN1, BLUEFIN_ID1);
        when(daoFacade.getTokenDAOInstance()).thenReturn(tokenRepositoryDAOImpl);
        when(daoFacade.getTokenDAOInstance().findByVoltageTokenWithoutBluefin(anyString())).thenReturn(null);
        when(voltageClient.deTokenize(any(TokenDTO.class))).thenReturn(PLAINTEXT1);
        doNothing().when(tokenRepositoryDAOImpl)
                .createToken(any(Token.class));
        when(daoFacade.getTokenDAOInstance().findByVaultId(anyString())).thenReturn(token);

        List<TokenDataDTO> tokenDataDTOList = tokenClientAdapter.retrieveVaultIdsFor(List.of(inputTokenDataDTO), "");

        assertNotNull(tokenDataDTOList);
        assertEquals(1, tokenDataDTOList.size());
        TokenDataDTO actualTokenDataDTO = tokenDataDTOList.get(0);
        assertEquals(VAULT_ID1, actualTokenDataDTO.getVaultId());
        assertEquals(VOLTAGE_TOKEN1, actualTokenDataDTO.getVoltageToken());
        assertNull(actualTokenDataDTO.getBluefinToken());
        assertNull(actualTokenDataDTO.getBluefinId());
    }

    @Test
    public void shouldPersistBluefinInfoAndRetrieveVaultIdsForVoltageTokenDTO() throws Exception {
        TokenDataDTO inputTokenDataDTO = getTokenDataDTOFor(VOLTAGE_TOKEN1, BLUEFIN_TOKEN1, VAULT_ID1, BLUEFIN_ID1);
        Token token = Token.builder().vaultId(VAULT_ID1).voltageToken(VOLTAGE_TOKEN1).build();
        BluefinTokenDTO bluefinTokenDTO = getBluefinTokenDTOFor(PLAINTEXT1, BLUEFIN_TOKEN1, BLUEFIN_ID1);
        when(vaultFeatureToggle.isBluefinEnabled()).thenReturn(true);
        when(daoFacade.getTokenDAOInstance()).thenReturn(tokenRepositoryDAOImpl);
        when(daoFacade.getTokenDAOInstance().findByVoltageToken(anyString())).thenReturn(token);
        when(voltageClient.deTokenize(any(TokenDTO.class))).thenReturn(PLAINTEXT1);
        when(bluefinAdapter.tokenize(PLAINTEXT1, DataType.CreditCardNumber)).thenReturn(bluefinTokenDTO);
        doNothing().when(tokenRepositoryDAOImpl).updateToken(anyString(), any(BluefinTokenDTO.class), anyString());

        List<TokenDataDTO> tokenDataDTOList = tokenClientAdapter.retrieveVaultIdsFor(List.of(inputTokenDataDTO), "");

        assertNotNull(tokenDataDTOList);
        assertEquals(1, tokenDataDTOList.size());
        TokenDataDTO actualTokenDataDTO = tokenDataDTOList.get(0);
        assertEquals(VAULT_ID1, actualTokenDataDTO.getVaultId());
        assertEquals(VOLTAGE_TOKEN1, actualTokenDataDTO.getVoltageToken());
        assertEquals(BLUEFIN_TOKEN1, actualTokenDataDTO.getBluefinToken());
        assertEquals(BLUEFIN_ID1, actualTokenDataDTO.getBluefinId());
    }

    @Test
    void shouldReturnListOfTokenDataDTOsGivenVoltageTokens() throws Exception {
        TokenDataDTO tokenDataDTO1 = getTokenDataDTOFor(VOLTAGE_TOKEN1, null, null, null);
        TokenDataDTO tokenDataDTO2 = getTokenDataDTOFor(VOLTAGE_TOKEN2, null, null, null);
        Token token1 = getTokenFor(VAULT_ID1, VOLTAGE_TOKEN1, BLUEFIN_TOKEN1, BLUEFIN_ID1);
        Token token2 = getTokenFor(VAULT_ID2, VOLTAGE_TOKEN2, BLUEFIN_TOKEN2, BLUEFIN_ID2);
        when(vaultFeatureToggle.isBluefinEnabled()).thenReturn(true);
        when(daoFacade.getTokenDAOInstance()).thenReturn(tokenRepositoryDAOImpl);
        when(daoFacade.getTokenDAOInstance().findByVoltageToken(VOLTAGE_TOKEN1)).thenReturn(token1);
        when(daoFacade.getTokenDAOInstance().findByVoltageToken(VOLTAGE_TOKEN2)).thenReturn(token2);

        List<TokenDataDTO> tokenDataDTOS = tokenClientAdapter.retrieveVaultIdsFor(asList(tokenDataDTO1, tokenDataDTO2), "");

        assertNotNull(tokenDataDTOS);
        assertEquals(2, tokenDataDTOS.size());
        assertEquals(VAULT_ID1, tokenDataDTOS.get(0).getVaultId());
        assertEquals(BLUEFIN_TOKEN1, tokenDataDTOS.get(0).getBluefinToken());
        assertEquals(BLUEFIN_ID1, tokenDataDTOS.get(0).getBluefinId());
        assertEquals(VAULT_ID2, tokenDataDTOS.get(1).getVaultId());
        assertEquals(BLUEFIN_TOKEN2, tokenDataDTOS.get(1).getBluefinToken());
        assertEquals(BLUEFIN_ID2, tokenDataDTOS.get(1).getBluefinId());
    }

    @Test
    void shouldReturnListOfTokenDataDTOsGivenVoltageTokensWhenBluefinIsDisabled() throws Exception {
        TokenDataDTO tokenDataDTO1 = getTokenDataDTOFor(VOLTAGE_TOKEN1, null, null, null);
        TokenDataDTO tokenDataDTO2 = getTokenDataDTOFor(VOLTAGE_TOKEN2, null, null, null);
        Token token1 = getTokenFor(VAULT_ID1, VOLTAGE_TOKEN1, BLUEFIN_TOKEN1, BLUEFIN_ID1);
        Token token2 = getTokenFor(VAULT_ID2, VOLTAGE_TOKEN2, null, null);
        when(daoFacade.getTokenDAOInstance()).thenReturn(tokenRepositoryDAOImpl);
        when(daoFacade.getTokenDAOInstance().findByVoltageToken(VOLTAGE_TOKEN1)).thenReturn(token1);
        when(daoFacade.getTokenDAOInstance().findByVoltageToken(VOLTAGE_TOKEN2)).thenReturn(token2);

        List<TokenDataDTO> tokenDataDTOS = tokenClientAdapter.retrieveVaultIdsFor(asList(tokenDataDTO1, tokenDataDTO2), "");

        assertNotNull(tokenDataDTOS);
        assertEquals(2, tokenDataDTOS.size());
        assertEquals(VAULT_ID1, tokenDataDTOS.get(0).getVaultId());
        assertEquals(VAULT_ID2, tokenDataDTOS.get(1).getVaultId());
        assertNull(tokenDataDTOS.get(0).getBluefinToken());
        assertNull(tokenDataDTOS.get(0).getBluefinId());
        assertNull(tokenDataDTOS.get(1).getBluefinToken());
        assertNull(tokenDataDTOS.get(1).getBluefinId());
    }

    @Test
    void shouldReturnListOfTokenDataDTOsGivenVoltageTokensWhenBluefinTokenIsNotInDB() throws Exception {
        TokenDataDTO tokenDataDTO1 = getTokenDataDTOFor(VOLTAGE_TOKEN1, null, null, null);
        TokenDataDTO tokenDataDTO2 = getTokenDataDTOFor(VOLTAGE_TOKEN2, null, null, null);
        Token token1 = getTokenFor(VAULT_ID1, VOLTAGE_TOKEN1, BLUEFIN_TOKEN1, BLUEFIN_ID1);
        Token token2 = getTokenFor(VAULT_ID2, VOLTAGE_TOKEN2, null, null);

        when(vaultFeatureToggle.isBluefinEnabled()).thenReturn(true);
        when(daoFacade.getTokenDAOInstance()).thenReturn(tokenRepositoryDAOImpl);
        when(daoFacade.getTokenDAOInstance().findByVoltageToken(VOLTAGE_TOKEN1)).thenReturn(null);
        when(daoFacade.getTokenDAOInstance().findByVoltageToken(VOLTAGE_TOKEN2)).thenReturn(token2);
        doNothing().when(tokenRepositoryDAOImpl)
                .createToken(any(Token.class));
        when(voltageClient.deTokenize(new TokenDTO(VOLTAGE_TOKEN1))).thenReturn(PLAINTEXT1);
        when(voltageClient.deTokenize(new TokenDTO(VOLTAGE_TOKEN2))).thenReturn(PLAINTEXT2);

        BluefinTokenDTO bluefinTokenDTO1 = getBluefinTokenDTOFor(PLAINTEXT1, BLUEFIN_TOKEN1, BLUEFIN_ID1);
        BluefinTokenDTO bluefinTokenDTO2 = getBluefinTokenDTOFor(PLAINTEXT2, BLUEFIN_TOKEN2, BLUEFIN_ID2);
        when(bluefinAdapter.tokenize(asList(PLAINTEXT1, PLAINTEXT2), DataType.CreditCardNumber)).thenReturn(asList(bluefinTokenDTO1, bluefinTokenDTO2));
        when(daoFacade.getTokenDAOInstance().findByVaultId(anyString())).thenReturn(token1);
        doNothing().when(tokenRepositoryDAOImpl).updateToken(anyString(), any(BluefinTokenDTO.class), any());

        List<TokenDataDTO> tokenDataDTOS = tokenClientAdapter.retrieveVaultIdsFor(asList(tokenDataDTO1, tokenDataDTO2), "");

        assertNotNull(tokenDataDTOS);
        assertEquals(2, tokenDataDTOS.size());

        assertEquals(VAULT_ID1, tokenDataDTOS.get(0).getVaultId());
        assertEquals(BLUEFIN_TOKEN1, tokenDataDTOS.get(0).getBluefinToken());
        assertEquals(BLUEFIN_ID1, tokenDataDTOS.get(0).getBluefinId());

        assertEquals(VAULT_ID2, tokenDataDTOS.get(1).getVaultId());
        assertEquals(BLUEFIN_TOKEN2, tokenDataDTOS.get(1).getBluefinToken());
        assertEquals(BLUEFIN_ID2, tokenDataDTOS.get(1).getBluefinId());
    }

    @Test
    void shouldThrowExceptionWhenBluefinTokenizationFails() throws Exception {
        TokenDataDTO tokenDataDTO1 = getTokenDataDTOFor(VOLTAGE_TOKEN1, null, null, null);
        when(vaultFeatureToggle.isBluefinEnabled()).thenReturn(true);
        when(daoFacade.getTokenDAOInstance()).thenReturn(tokenRepositoryDAOImpl);
        when(daoFacade.getTokenDAOInstance().findByVoltageToken(anyString())).thenReturn(null);
        when(voltageClient.deTokenize(new TokenDTO(VOLTAGE_TOKEN1))).thenReturn(PLAINTEXT1);
        when(bluefinAdapter.tokenize(anyString(), any())).thenThrow(new BluefinException(""));

        VaultServiceException actualException = assertThrows(VaultServiceException.class, () ->
                tokenClientAdapter.retrieveVaultIdsFor(asList(tokenDataDTO1), ""));

        assertEquals(ErrorEntityCodes.BLUEFIN_TOKENIZE_EXECPTION, actualException.getMessage());
    }

    @Test
    void shouldThrowExceptionWhenBluefinBulkTokenizationFails() throws Exception {
        TokenDataDTO tokenDataDTO1 = getTokenDataDTOFor(VOLTAGE_TOKEN1, null, null, null);
        TokenDataDTO tokenDataDTO2 = getTokenDataDTOFor(VOLTAGE_TOKEN2, null, null, null);
        when(vaultFeatureToggle.isBluefinEnabled()).thenReturn(true);
        when(daoFacade.getTokenDAOInstance()).thenReturn(tokenRepositoryDAOImpl);
        when(daoFacade.getTokenDAOInstance().findByVoltageToken(anyString())).thenReturn(null);
        when(daoFacade.getTokenDAOInstance().findByVoltageToken(anyString())).thenReturn(null);
        when(voltageClient.deTokenize(new TokenDTO(VOLTAGE_TOKEN1))).thenReturn(PLAINTEXT1);
        when(voltageClient.deTokenize(new TokenDTO(VOLTAGE_TOKEN2))).thenReturn(PLAINTEXT2);
        when(bluefinAdapter.tokenize(asList(PLAINTEXT1, PLAINTEXT2), DataType.CreditCardNumber)).thenThrow(new BluefinException(""));

        VaultServiceException actualException = assertThrows(VaultServiceException.class, () ->
                tokenClientAdapter.retrieveVaultIdsFor(asList(tokenDataDTO1, tokenDataDTO2), ""));

        assertEquals(ErrorEntityCodes.BLUEFIN_TOKENIZE_EXECPTION, actualException.getMessage());
    }

    @Test
    void shouldReturnListOfTokenDataDTOsWithVoltageTokenWhenBluefinTokenDataDTOsAreGiven() throws VaultServiceException, TimeoutException {
        TokenDataDTO tokenDataDTO1 = getTokenDataDTOFor(null, BLUEFIN_TOKEN1, null, BLUEFIN_ID1);
        TokenDataDTO tokenDataDTO2 = getTokenDataDTOFor(null, BLUEFIN_TOKEN2, null, BLUEFIN_ID2);
        Token token1 = getTokenFor(VAULT_ID1, VOLTAGE_TOKEN1, BLUEFIN_TOKEN1, BLUEFIN_ID1);
        Token token2 = getTokenFor(VAULT_ID2, VOLTAGE_TOKEN2, BLUEFIN_TOKEN2, BLUEFIN_ID2);

        when(daoFacade.getTokenDAOInstance()).thenReturn(tokenRepositoryDAOImpl);
        when(daoFacade.getTokenDAOInstance().findByBluefinToken(BLUEFIN_TOKEN1)).thenReturn(token1);
        when(daoFacade.getTokenDAOInstance().findByBluefinToken(BLUEFIN_TOKEN2)).thenReturn(token2);

        List<TokenDataDTO> tokenDataDTOS = tokenClientAdapter.retrieveVaultIdsForBluefinTokens(asList(tokenDataDTO1, tokenDataDTO2), "");

        assertNotNull(tokenDataDTOS);
        assertEquals(2, tokenDataDTOS.size());
        assertEquals(VAULT_ID1, tokenDataDTOS.get(0).getVaultId());
        assertEquals(VOLTAGE_TOKEN1, tokenDataDTOS.get(0).getVoltageToken());
        assertEquals(VAULT_ID2, tokenDataDTOS.get(1).getVaultId());
        assertEquals(VOLTAGE_TOKEN2, tokenDataDTOS.get(1).getVoltageToken());
    }

    @Test
    void shouldReturnListOfTokenDataDTOsWithVoltageTokenAndCreateTokensInDBWhenTokensAreNotFoundForGivenBluefinTokens() throws VaultServiceException, BluefinException, TimeoutException, BluefinTimeoutException {
        TokenDataDTO tokenDataDTO1 = getTokenDataDTOFor(null, BLUEFIN_TOKEN1, null, BLUEFIN_ID1);
        TokenDataDTO tokenDataDTO2 = getTokenDataDTOFor(null, BLUEFIN_TOKEN2, null, BLUEFIN_ID2);
        Token token1 = getTokenFor(VAULT_ID1, VOLTAGE_TOKEN1, BLUEFIN_TOKEN1, BLUEFIN_ID1);
        Token token2 = getTokenFor(VAULT_ID2, VOLTAGE_TOKEN2, BLUEFIN_TOKEN2, BLUEFIN_ID2);

        when(daoFacade.getTokenDAOInstance()).thenReturn(tokenRepositoryDAOImpl);
        when(daoFacade.getTokenDAOInstance().findByBluefinToken(BLUEFIN_TOKEN1)).thenReturn(null);
        when(daoFacade.getTokenDAOInstance().findByBluefinToken(BLUEFIN_TOKEN2)).thenReturn(null);
        when(bluefinAdapter.deTokenize(anyList(), any())).thenReturn(asList(PLAINTEXT1, PLAINTEXT2));
        when(voltageClient.tokenize(PLAINTEXT1)).thenReturn(VOLTAGE_TOKEN1);
        when(voltageClient.tokenize(PLAINTEXT2)).thenReturn(VOLTAGE_TOKEN2);

        when(daoFacade.getTokenDAOInstance().findByVaultId(anyString())).thenReturn(token1).thenReturn(token2);

        List<TokenDataDTO> tokenDataDTOS = tokenClientAdapter.retrieveVaultIdsForBluefinTokens(asList(tokenDataDTO1, tokenDataDTO2), "");

        assertNotNull(tokenDataDTOS);
        assertEquals(2, tokenDataDTOS.size());
        assertEquals(VAULT_ID1, tokenDataDTOS.get(0).getVaultId());
        assertEquals(VOLTAGE_TOKEN1, tokenDataDTOS.get(0).getVoltageToken());
        assertEquals(VAULT_ID2, tokenDataDTOS.get(1).getVaultId());
        assertEquals(VOLTAGE_TOKEN2, tokenDataDTOS.get(1).getVoltageToken());
        verify(daoFacade.getTokenDAOInstance(), times(2)).createToken(any(Token.class));
    }

    @Test
    void shouldThrowExceptionWhenBluefinBulkDeTokenizationFails() throws BluefinException, VaultServiceException, TimeoutException, BluefinTimeoutException {
        TokenDataDTO tokenDataDTO1 = getTokenDataDTOFor(null, BLUEFIN_TOKEN1, null, BLUEFIN_ID1);
        TokenDataDTO tokenDataDTO2 = getTokenDataDTOFor(null, BLUEFIN_TOKEN2, null, BLUEFIN_ID2);

        when(daoFacade.getTokenDAOInstance()).thenReturn(tokenRepositoryDAOImpl);
        when(daoFacade.getTokenDAOInstance().findByBluefinToken(BLUEFIN_TOKEN1)).thenReturn(null);
        when(daoFacade.getTokenDAOInstance().findByBluefinToken(BLUEFIN_TOKEN1)).thenReturn(null);
        when(bluefinAdapter.deTokenize(anyList(), any())).thenThrow(new BluefinException(""));

        VaultServiceException actualException = assertThrows(VaultServiceException.class, () ->
                tokenClientAdapter.retrieveVaultIdsForBluefinTokens(asList(tokenDataDTO1, tokenDataDTO2), "")
        );

        assertEquals(ErrorEntityCodes.BLUEFIN_DETOKENIZE_EXECPTION, actualException.getMessage());
    }

    @Test
    void shouldUpdateBluefinInformationWhenVoltageTokenExist() throws BluefinException, VaultServiceException, TimeoutException, BluefinTimeoutException {
        Token token1 = getTokenFor(VAULT_ID1, VOLTAGE_TOKEN1, null, null);
        Token token2 = getTokenFor(VAULT_ID2, VOLTAGE_TOKEN2, null, null);
        List<TokenDataDTO> tokenDataDTOs = new ArrayList<>();
        tokenDataDTOs.add(getTokenDataDTOFor(null, BLUEFIN_TOKEN1, null, BLUEFIN_ID1));
        tokenDataDTOs.add(getTokenDataDTOFor(null, BLUEFIN_TOKEN2, null, BLUEFIN_ID2));
        when(vaultFeatureToggle.isBluefinEnabled()).thenReturn(true);
        when(daoFacade.getTokenDAOInstance()).thenReturn(tokenRepositoryDAOImpl);
        when(daoFacade.getTokenDAOInstance().findByBluefinToken(BLUEFIN_TOKEN1)).thenReturn(null);
        when(daoFacade.getTokenDAOInstance().findByBluefinToken(BLUEFIN_TOKEN2)).thenReturn(token2);
        when(bluefinAdapter.deTokenize(any(DeTokenizeRequestDTO.class), any())).thenReturn(PLAINTEXT1);
        when(voltageClient.tokenize(anyString())).thenReturn(VOLTAGE_TOKEN1).thenReturn(VOLTAGE_TOKEN2);
        when(daoFacade.getTokenDAOInstance().findByVoltageToken(VOLTAGE_TOKEN1)).thenReturn(token1);
        when(daoFacade.getTokenDAOInstance().findByVoltageToken(VOLTAGE_TOKEN2)).thenReturn(null);

        List<TokenDataDTO> actualTokenDataDTOs = tokenClientAdapter.retrieveVaultIdsForBluefinTokens(tokenDataDTOs, "");
        TokenDataDTO tokenDataDTO1 = actualTokenDataDTOs.get(0);
        TokenDataDTO tokenDataDTO2 = actualTokenDataDTOs.get(1);

        assertEquals(2, actualTokenDataDTOs.size());
        assertEquals(BLUEFIN_TOKEN1, tokenDataDTO1.getBluefinToken());
        assertEquals(BLUEFIN_ID1, tokenDataDTO1.getBluefinId());
        assertEquals(VAULT_ID1, tokenDataDTO1.getVaultId());
        assertEquals(VOLTAGE_TOKEN1, tokenDataDTO1.getVoltageToken());
        assertEquals(BLUEFIN_TOKEN2, tokenDataDTO2.getBluefinToken());
        assertEquals(BLUEFIN_ID2, tokenDataDTO2.getBluefinId());
        assertEquals(VAULT_ID2, tokenDataDTO2.getVaultId());
        assertEquals(VOLTAGE_TOKEN2, tokenDataDTO2.getVoltageToken());
    }

    private BluefinTokenDTO getBluefinTokenDTOFor(String inputValue, String token, String bluefinId) {
        return BluefinTokenDTO.builder()
                .inputValue(inputValue)
                .token(token)
                .bfid(bluefinId)
                .build();
    }

    private Token getTokenFor(String vaultId, String voltageToken, String bluefinToken, String bluefinId) {
        return Token.builder()
                .vaultId(vaultId)
                .voltageToken(voltageToken)
                .bluefinToken(bluefinToken)
                .bluefinId(bluefinId)
                .build();
    }

    private VaultClientRequest createVaultClientRequest() {
        List<TokenRequest> tokenRequests = new ArrayList<>();
        TokenRequest tokenRequest1 = TokenRequest.builder()
                .type("CreditCardNumber")
                .index(0)
                .data("4479951709255127")
                .build();

        TokenRequest tokenRequest2 = TokenRequest.builder()
                .type("CreditCardNumber")
                .index(1)
                .data("4489951947255128")
                .build();

        tokenRequests.add(tokenRequest1);
        tokenRequests.add(tokenRequest2);

        return VaultClientRequest.builder()
                .responseFormat(VaultConstants.DATA_TYPE_TOKEN)
                .requestFormat("CreditCardNumber")
                .requestData(setTokenDataList(tokenRequests))
                .build();
    }

    private VaultClientResponse getVaultClientResponse() {
        ArrayList<VaultClientResult> vaultClientResults = new ArrayList<>();

        VaultClientResult vaultClientResult1 = VaultClientResult.builder()
                .requestData("4479951709255127")
                .responseData("4479953958875127")
                .build();

        VaultClientResult vaultClientResult2 = VaultClientResult.builder()
                .requestData("4489951947255128")
                .responseData("4489951583665128")
                .build();

        vaultClientResults.add(vaultClientResult1);
        vaultClientResults.add(vaultClientResult2);

        return VaultClientResponse.builder()
                .responseFormat(VaultConstants.DATA_TYPE_TOKEN)
                .requestFormat("CreditCardNumber")
                .result(vaultClientResults)
                .build();
    }

    private List<TokenDataDTO> getTokenDataDTOs() {
        List<TokenDataDTO> tokenDataDTOs = new ArrayList<>();
        tokenDataDTOs.add(getTokenDataDTOFor(VOLTAGE_TOKEN1, BLUEFIN_TOKEN1, VAULT_ID1, BLUEFIN_ID1));
        tokenDataDTOs.add(getTokenDataDTOFor(VOLTAGE_TOKEN2, BLUEFIN_TOKEN2, VAULT_ID2, BLUEFIN_ID2));
        return tokenDataDTOs;
    }

    private TokenDataDTO getTokenDataDTOFor(String voltageToken, String bluefinToken, String vaultId, String bluefinId) {
        return TokenDataDTO.builder()
                .voltageToken(voltageToken)
                .bluefinToken(bluefinToken)
                .vaultId(vaultId)
                .bluefinId(bluefinId)
                .build();
    }

    private String[] setTokenDataList(List<TokenRequest> tokenRequests) {
        return tokenRequests.stream()
                .map(TokenRequest::getData)
                .toArray(String[]::new);
    }
}
