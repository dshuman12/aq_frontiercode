package com.gap.customer.vaultservice.services.Impl;

import com.gap.customer.vaultservice.dto.TokenDataDTO;
import com.gap.customer.vaultservice.error.ErrorEntityCodes;
import com.gap.customer.vaultservice.exception.VaultServiceException;
import com.gap.customer.vaultservice.models.MatchRequest;
import com.gap.customer.vaultservice.models.MatchResponse;
import com.gap.customer.vaultservice.models.SearchResponse;
import com.gap.customer.vaultservice.models.TokenRequest;
import com.gap.customer.vaultservice.models.TokenResponse;
import com.gap.customer.vaultservice.models.TokenSearchRequest;
import com.gap.customer.vaultservice.models.VaultClientRequest;
import com.gap.customer.vaultservice.models.VaultClientResponse;
import com.gap.customer.vaultservice.models.VaultClientResult;
import com.gap.customer.vaultservice.models.VaultFeatureToggle;
import com.gap.customer.vaultservice.models.VaultRequest;
import com.gap.customer.vaultservice.util.VaultConstants;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.MockitoAnnotations;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.junit.jupiter.SpringExtension;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(SpringExtension.class)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
public class ClientMediatorTest {

    @Mock
    private VaultClientResponseHelper vaultClientResponseHelper;
    @Mock
    private TokenClientAdapter tokenClientAdapter;
    @Mock
    private VaultFeatureToggle vaultFeatureToggle;

    private ClientMediator clientMediator;

    @BeforeEach
    public void setUp() {
        MockitoAnnotations.openMocks(this);
        clientMediator = new ClientMediator(vaultClientResponseHelper, tokenClientAdapter, vaultFeatureToggle);
    }

    @Test
    public void shouldReturnTokensForGivenCreditCardNumbers() throws VaultServiceException {
        List<TokenResponse> expectedResponse = getListOfTokenResponse();
        when(tokenClientAdapter.store(anyList(), anyString())).thenReturn(getTokenDataDTOsForCreditCardTokenEntries());

        List<TokenResponse> tokenResponses = clientMediator.mapperForTokenEntries(getVaultRequestForTokenEntries(), "UNAUTHENTICATED");

        assertEquals(2, tokenResponses.size());
        assertEquals(expectedResponse, tokenResponses);
    }


    @Test
    public void shouldReturnVaultClientResponseForMapperForVaultEntriesSearchWhenGivenVaultClientRequestIsValid() throws Exception {
        VaultClientRequest vaultClientRequest = createVaultClientRequestForSearchByVaultIdForToken();

        when(vaultClientResponseHelper.searchByVaultIdForToken(any(VaultClientRequest.class), anyString()))
                .thenReturn(getVaultClientResponseForVaultEntriesSearch());

        VaultClientResponse expectedResponse = getVaultClientResponseForVaultEntriesSearch();
        VaultClientResponse actualResponse = clientMediator.mapperForVaultEntriesSearch(vaultClientRequest, "");

        Mockito.verify(vaultClientResponseHelper).searchByVaultIdForToken(vaultClientRequest, "");
        assertEquals(expectedResponse.getResult().size(), actualResponse.getResult().size());
        assertEquals(expectedResponse.getResult(), actualResponse.getResult());
    }

    @Test
    public void shouldThrowErrorForMapperForVaultEntriesSearchWhenSearchByVaultIdForTokenThrowsAnError() throws Exception {
        VaultClientRequest vaultClientRequest = createVaultClientRequestForSearchByVaultIdForToken();

        String ERROR_MESSAGE = "Unable to fetch token info for given vault ids";
        when(vaultClientResponseHelper.searchByVaultIdForToken(any(VaultClientRequest.class), anyString()))
                .thenThrow(new VaultServiceException(ERROR_MESSAGE));
        VaultServiceException actualResult = assertThrows(VaultServiceException.class, () ->
                clientMediator.mapperForVaultEntriesSearch(vaultClientRequest, ""));

        Mockito.verify(vaultClientResponseHelper).searchByVaultIdForToken(vaultClientRequest, "");
        assertEquals(ERROR_MESSAGE, actualResult.getMessage());
    }

    @Test
    public void shouldReturnVaultClientResponseForMapperForVaultEntriesSearchWhenVaultClientRequestIsGivenForEncryptedData() throws Exception {
        VaultClientRequest request = getVaultClientRequestForSearchByVaultIdForEncryptedData();
        VaultClientResponse response = getVaultClientResponseForEncryptedDataVaultEntriesSearch();

        when(vaultClientResponseHelper.searchByVaultIdForEncryptedCard(any(VaultClientRequest.class)))
                .thenReturn(response);

        VaultClientResponse actualResponse = clientMediator.mapperForVaultEntriesSearch(request, "");

        Mockito.verify(vaultClientResponseHelper).searchByVaultIdForEncryptedCard(request);
        assertEquals(response.getResult().size(), actualResponse.getResult().size());
        assertEquals(response.getResult(), actualResponse.getResult());
    }

    @Test
    public void shouldThrowErrorForMapperForVaultEntriesSearchWhenSearchByVaultIdForEncryptedCardThrowsAnError() throws Exception {
        VaultClientRequest vaultClientRequest = getVaultClientRequestForSearchByVaultIdForEncryptedData();
        String ERROR_MESSAGE = "Unable to fetch giftcard info for given vault ids";

        when(vaultClientResponseHelper.searchByVaultIdForEncryptedCard(any(VaultClientRequest.class)))
                .thenThrow(new VaultServiceException(ERROR_MESSAGE));

        VaultServiceException actualResult = assertThrows(VaultServiceException.class, () ->
                clientMediator.mapperForVaultEntriesSearch(vaultClientRequest, ""));

        Mockito.verify(vaultClientResponseHelper).searchByVaultIdForEncryptedCard(vaultClientRequest);
        assertEquals(ERROR_MESSAGE, actualResult.getMessage());
    }

    @Test
    public void mapperForTokenEntriesSearchShouldReturnValidSearchResponse() throws Exception {
        List<TokenDataDTO> tokenDataDTOs = getTokenDataDTOs();
        List<SearchResponse> expectedSearchResponses = new ArrayList<>();
        expectedSearchResponses.add(SearchResponse.builder().responseData("4H7995170925512744799517092551AG").token("4479951709255127").tokenId("BFID_1").index(0).build());
        expectedSearchResponses.add(SearchResponse.builder().responseData("4H7995170925512744799517092551AA").token("4479951709255128").tokenId("BFID_2").index(1).build());
        when(tokenClientAdapter.retrieveVaultIdsFor(anyList(), anyString())).thenReturn(tokenDataDTOs);

        List<SearchResponse> actualSearchResponses = clientMediator.mapperForTokenEntriesSearch(getTokenSearchRequest(), "UNAUTHENTICATED");

        assertEquals(expectedSearchResponses, actualSearchResponses);
    }

    @Test
    public void mapperForTokenEntriesSearchShouldReturnValidSearchResponseWhenBluefinAndVoltageTokenRequestsAreGivenAndBluefinFlagIsOn() throws Exception {
        List<SearchResponse> expectedSearchResponses = new ArrayList<>();
        expectedSearchResponses.add(getSearchResponseFor("4H7995170925512744799517092551AA", "4479951709255128", null, 1));
        expectedSearchResponses.add(getSearchResponseFor("4H7995170925512744799517092551AG", "4479951709255127", "BFID_1", 0));

        when(vaultFeatureToggle.isBluefinEnabled()).thenReturn(true);
        when(tokenClientAdapter.retrieveVaultIdsFor(anyList(), anyString()))
                .thenReturn(getTokenDataDTOsWithBluefinTokenInfo());
        when(tokenClientAdapter.retrieveVaultIdsForBluefinTokens(anyList(), anyString()))
                .thenReturn(getTokenDataDTOsWithVoltageTokenInfo());

        List<SearchResponse> actualSearchResponses = clientMediator.mapperForTokenEntriesSearch(
                getTokenSearchRequestWithBluefinAndVoltageTokens(), "");

        assertEquals(expectedSearchResponses, actualSearchResponses);
    }

    @Test
    public void mapperForTokenEntriesSearchShouldThrowExceptionWhenBluefinAndVoltageTokenRequestsAreGivenAndBluefinFlagIsOff() throws Exception {
        when(vaultFeatureToggle.isBluefinEnabled()).thenReturn(false);

        VaultServiceException actualException = assertThrows(VaultServiceException.class, () -> clientMediator.mapperForTokenEntriesSearch(
                getTokenSearchRequestWithBluefinAndVoltageTokens(),
                ""
        ));

        assertEquals(ErrorEntityCodes.BLUEFIN_NOT_SUPPORTED, actualException.getMessage());
    }

    @Test
    public void shouldReturnMatchResponseForMapperForMatchWhenMatchRequestIsGiven() throws Exception {
        MatchResponse matchResponse = MatchResponse.builder().result(true).build();
        when(vaultClientResponseHelper.matchPassword(any(MatchRequest.class))).thenReturn(matchResponse);

        MatchResponse actualResponse = clientMediator.mapperForMatch(getMatchRequest());

        assertEquals(matchResponse, actualResponse);
    }

    @Test
    public void shouldThrowExceptionForMapperForMatchWhenMatchPasswordThrowsAnException() throws Exception {
        VaultServiceException exception = new VaultServiceException("Something went wrong while processing the match request");
        when(vaultClientResponseHelper.matchPassword(any(MatchRequest.class))).thenThrow(exception);

        VaultServiceException actualException = assertThrows(VaultServiceException.class, () ->
                clientMediator.mapperForMatch(getMatchRequest()));

        assertEquals(exception.getMessage(), actualException.getMessage());
    }

    @Test
    void shouldReturnVaultClientResponseForMapperForVaultEntriesWhenVaultClientRequestIsGivenForCreditCardNumber()
            throws VaultServiceException {
        VaultClientRequest request = getVaultClientRequestForVaultEntriesOf(VaultConstants.REQ_TYPE_CREDIT_CARD_NUMBER);
        VaultClientResponse response = getVaultClientResponseForVaultEntriesOf(VaultConstants.REQ_TYPE_CREDIT_CARD_NUMBER);
        String appName = "test";

        when(vaultClientResponseHelper.createVaultIdDataForCreditCard(request, appName))
                .thenReturn(response);

        VaultClientResponse actualResponse = clientMediator.mapperForVaultEntries(request, appName);

        Mockito.verify(vaultClientResponseHelper).createVaultIdDataForCreditCard(request, appName);
        assertEquals(response, actualResponse);
    }

    @Test
    public void shouldThrowErrorForMapperForVaultEntriesWhenCreateVaultIdDataForCreditCardThrowsAnError() throws Exception {
        VaultClientRequest request = getVaultClientRequestForVaultEntriesOf(VaultConstants.REQ_TYPE_CREDIT_CARD_NUMBER);
        String appName = "test";

        String ERROR_MESSAGE = "Unable to create vault id data for given creditCardNumber";
        when(vaultClientResponseHelper.createVaultIdDataForCreditCard(request, appName))
                .thenThrow(new VaultServiceException(ERROR_MESSAGE));

        VaultServiceException actualResult = assertThrows(VaultServiceException.class, () ->
                clientMediator.mapperForVaultEntries(request, appName));

        Mockito.verify(vaultClientResponseHelper).createVaultIdDataForCreditCard(request, appName);
        assertEquals(ERROR_MESSAGE, actualResult.getMessage());
    }

    @Test
    void shouldReturnVaultClientResponseForMapperForVaultEntriesWhenVaultClientRequestIsGivenForPassword()
            throws VaultServiceException {
        VaultClientRequest request = getVaultClientRequestForVaultEntriesOf(VaultConstants.REQ_TYPE_PASSWORD);
        VaultClientResponse response = getVaultClientResponseForVaultEntriesOf(VaultConstants.REQ_TYPE_PASSWORD);
        String appName = "test";

        when(vaultClientResponseHelper.createVaultIdDataForPassword(request, appName))
                .thenReturn(response);

        VaultClientResponse actualResponse = clientMediator.mapperForVaultEntries(request, appName);

        Mockito.verify(vaultClientResponseHelper).createVaultIdDataForPassword(request, appName);
        assertEquals(response, actualResponse);
    }

    @Test
    public void shouldThrowErrorForMapperForVaultEntriesWhenCreateVaultIdDataForPasswordThrowsAnError() throws Exception {
        VaultClientRequest request = getVaultClientRequestForVaultEntriesOf(VaultConstants.REQ_TYPE_PASSWORD);
        String appName = "test";

        String ERROR_MESSAGE = "Unable to create vault id data for given password";
        when(vaultClientResponseHelper.createVaultIdDataForPassword(request, appName))
                .thenThrow(new VaultServiceException(ERROR_MESSAGE));

        VaultServiceException actualResult = assertThrows(VaultServiceException.class, () ->
                clientMediator.mapperForVaultEntries(request, appName));

        Mockito.verify(vaultClientResponseHelper).createVaultIdDataForPassword(request, appName);
        assertEquals(ERROR_MESSAGE, actualResult.getMessage());
    }

    @Test
    void shouldReturnVaultClientResponseForMapperForVaultEntriesWhenVaultClientRequestIsGivenForEncryptedData()
            throws VaultServiceException {
        VaultClientRequest request = getVaultClientRequestForVaultEntriesOf(VaultConstants.REQ_TYPE_GIFT_CARD_NUMBER);
        VaultClientResponse response = getVaultClientResponseForVaultEntriesOf(VaultConstants.REQ_TYPE_GIFT_CARD_NUMBER);
        String appName = "test";

        when(vaultClientResponseHelper.createVaultIdDataForEncryptedCard(request, appName))
                .thenReturn(response);

        VaultClientResponse actualResponse = clientMediator.mapperForVaultEntries(request, appName);

        assertEquals(response, actualResponse);
    }

    @Test
    public void shouldThrowErrorForMapperForVaultEntriesWhenCreateVaultIdDataForEncryptedCardThrowsAnError() throws Exception {
        VaultClientRequest request = getVaultClientRequestForVaultEntriesOf(VaultConstants.REQ_TYPE_GIFT_CARD_NUMBER);
        String appName = "test";

        String ERROR_MESSAGE = "Unable to create vault id data for given encryptedData";
        when(vaultClientResponseHelper.createVaultIdDataForEncryptedCard(request, appName))
                .thenThrow(new VaultServiceException(ERROR_MESSAGE));

        VaultServiceException actualResult = assertThrows(VaultServiceException.class, () ->
                clientMediator.mapperForVaultEntries(request, appName));

        Mockito.verify(vaultClientResponseHelper).createVaultIdDataForEncryptedCard(request, appName);
        assertEquals(ERROR_MESSAGE, actualResult.getMessage());
    }

    private List<TokenSearchRequest> getTokenSearchRequest() {
        List<TokenSearchRequest> tokenRequests = new ArrayList<>();
        tokenRequests.add(TokenSearchRequest.builder().token("4479951709255127").index(0).returnType("VAULT_ID").build());
        tokenRequests.add(TokenSearchRequest.builder().token("4479951709255128").index(1).returnType("VAULT_ID").build());
        return tokenRequests;
    }

    private List<TokenDataDTO> getTokenDataDTOsWithVoltageTokenInfo() {
        return List.of(getTokenDataDTOFor("4H7995170925512744799517092551AA",
                null,
                null,
                "4479951709255128")
        );
    }

    private List<TokenDataDTO> getTokenDataDTOsWithBluefinTokenInfo() {
        return List.of(getTokenDataDTOFor("4H7995170925512744799517092551AG",
                "4479951709255127",
                "BFID_1",
                null)
        );
    }

    private TokenDataDTO getTokenDataDTOFor(String vaultId, String bluefinToken, String bluefinId, String voltageToken) {
        return TokenDataDTO.builder()
                .vaultId(vaultId)
                .bluefinToken(bluefinToken)
                .bluefinId(bluefinId)
                .voltageToken(voltageToken)
                .build();
    }

    private SearchResponse getSearchResponseFor(String vaultId, String token, String tokenId, int index) {
        return SearchResponse.builder()
                .responseData(vaultId)
                .token(token)
                .tokenId(tokenId)
                .index(index)
                .build();
    }

    private List<TokenDataDTO> getTokenDataDTOs() {
        List<TokenDataDTO> tokenDataDTOs = new ArrayList<>();
        TokenDataDTO tokenDataDTO1 = TokenDataDTO.builder().vaultId("4H7995170925512744799517092551AG").bluefinToken("4479951709255127").bluefinId("BFID_1").build();
        TokenDataDTO tokenDataDTO2 = TokenDataDTO.builder().vaultId("4H7995170925512744799517092551AA").bluefinToken("4479951709255128").bluefinId("BFID_2").build();
        tokenDataDTOs.add(tokenDataDTO1);
        tokenDataDTOs.add(tokenDataDTO2);
        return tokenDataDTOs;
    }

    private List<TokenSearchRequest> getTokenSearchRequestWithBluefinAndVoltageTokens() {
        List<TokenSearchRequest> tokenRequests = new ArrayList<>();
        tokenRequests.add(TokenSearchRequest.builder().token("4479951709255127").index(0).returnType("VAULT_ID").build());
        tokenRequests.add(TokenSearchRequest.builder().token("4479951709255128").tokenId("BFID_1").index(1).returnType("VAULT_ID").build());
        return tokenRequests;
    }

    private VaultClientRequest createVaultClientRequestForSearchByVaultIdForToken() {
        List<TokenRequest> tokenRequests = new ArrayList<>();

        TokenRequest tokenRequest1 = TokenRequest.builder().type("Token").index(0).data("0A3C98B7FEE1D56CB991E3E18D6D6170").build();
        TokenRequest tokenRequest2 = TokenRequest.builder().type("Token").index(0).data("C77F3BACA901976D3A99A1818E26C287").build();

        tokenRequests.add(tokenRequest1);
        tokenRequests.add(tokenRequest2);

        return VaultClientRequest.builder()
                .responseFormat(VaultConstants.REQ_TYPE_TOKEN)
                .requestFormat("Token")
                .requestData(setTokenDataList(tokenRequests))
                .build();
    }

    private VaultClientRequest getVaultClientRequestForSearchByVaultIdForEncryptedData() {
        return VaultClientRequest.builder()
                .responseFormat(VaultConstants.DATA_TYPE_GIFT_CARD_NUMBER)
                .requestData(List.of("0A3C98B7FEE1D56CB991E3E18D6D6170").toArray(String[]::new))
                .build();
    }

    private MatchRequest getMatchRequest() {
        return MatchRequest.builder()
                .plaintext("testPassword")
                .vaultId("26DD0155DFBB037CCAE71ADBCA67A689")
                .type(VaultConstants.DATA_TYPE_PASSWORD)
                .build();
    }

    private List<VaultRequest> getVaultRequestForTokenEntries() {
        List<VaultRequest> vaultRequests = new ArrayList<>();
        vaultRequests.add(VaultRequest.builder().type("CREDIT_CARD_NUMBER").plaintext("4479951709255127").index(0).build());
        vaultRequests.add(VaultRequest.builder().type("CREDIT_CARD_NUMBER").plaintext("4489951947255128").index(1).build());
        return vaultRequests;
    }

    private List<TokenResponse> getListOfTokenResponse() {
        List<TokenResponse> tokenResponses = new ArrayList<>();
        TokenResponse tokenResponse1 = TokenResponse.builder()
                .token("4479950329695127")
                .bfToken("4479952618035127")
                .tokenId("djI6MTIwMjIwMjI0MTAzODU1MTAxMzQ5NjkwNyMwfGJjNWQwNTdiNTAzOTIwMDc3YmRmMGJmYTc4NWFhZTZmfHx8")
                .vaultId("3CFB3DFA5995CC7681699A692479C047")
                .index(0)
                .build();

        TokenResponse tokenResponse2 = TokenResponse.builder()
                .token("4489958470835128")
                .bfToken("4489954381795128")
                .tokenId("djI6MTIwMjIwMjI0MTAzODU1MTAxMzQ5NjkwNyMxfGJjNWQwNTdiNTAzOTIwMDc3YmRmMGJmYTc4NWFhZTZmfHx8")
                .vaultId("3CFB3DFA5995CC7681699A692479C048")
                .index(1)
                .build();
        tokenResponses.add(tokenResponse1);
        tokenResponses.add(tokenResponse2);
        return tokenResponses;
    }

    private List<TokenDataDTO> getTokenDataDTOsForCreditCardTokenEntries() {
        ArrayList<TokenDataDTO> tokenDataDTOs = new ArrayList<>();
        TokenDataDTO tokenDataDTO1 = TokenDataDTO.builder().voltageToken("4479950329695127")
                .bluefinToken("4479952618035127")
                .vaultId("3CFB3DFA5995CC7681699A692479C047")
                .bluefinId("djI6MTIwMjIwMjI0MTAzODU1MTAxMzQ5NjkwNyMwfGJjNWQwNTdiNTAzOTIwMDc3YmRmMGJmYTc4NWFhZTZmfHx8")
                .plaintext("4479951709255127")
                .build();
        tokenDataDTOs.add(tokenDataDTO1);

        TokenDataDTO tokenDataDTO2 = TokenDataDTO.builder().voltageToken("4489958470835128")
                .bluefinToken("4489954381795128")
                .vaultId("3CFB3DFA5995CC7681699A692479C048")
                .bluefinId("djI6MTIwMjIwMjI0MTAzODU1MTAxMzQ5NjkwNyMxfGJjNWQwNTdiNTAzOTIwMDc3YmRmMGJmYTc4NWFhZTZmfHx8")
                .plaintext("4489951947255128")
                .build();
        tokenDataDTOs.add(tokenDataDTO2);

        return tokenDataDTOs;
    }

    private VaultClientResponse getVaultClientResponseForVaultEntriesSearch() {
        var vaultClientResults = new ArrayList<VaultClientResult>();
        vaultClientResults.add(VaultClientResult.builder()
                .requestData("0A3C98B7FEE1D56CB991E3E18D6D6170")
                .responseData("4485867467951655")
                .bluefinId("djI6MTIwMjIwMjE2MTM0NDMxMTAxMjI5Nzg2NXxiYzVkMDU3YjUwMzkyMDA3N2JkZjBiZmE3ODVhYWU2Znx8fA==")
                .bluefinToken("4485861361361655")
                .build());
        vaultClientResults.add(VaultClientResult.builder()
                .requestData("C77F3BACA901976D3A99A1818E26C287")
                .responseData("6018596782192368")
                .bluefinId("djI6MTIwMjIwMjE3MDU1MjU5MTAyMTU4NjA3MnxiYzVkMDU3YjUwMzkyMDA3N2JkZjBiZmE3ODVhYWU2Znx8fA==")
                .bluefinToken("6018592939132368")
                .build());

        return VaultClientResponse.builder()
                .result(vaultClientResults)
                .requestFormat("VAULT_ID")
                .responseFormat(VaultConstants.DATA_TYPE_TOKEN)
                .build();
    }

    private VaultClientResponse getVaultClientResponseForEncryptedDataVaultEntriesSearch() {
        var vaultClientResults = new ArrayList<VaultClientResult>();
        vaultClientResults.add(VaultClientResult.builder()
                .requestData("0A3C98B7FEE1D56CB991E3E18D6D6170")
                .responseData("4485867467951655")
                .build());

        return VaultClientResponse.builder()
                .result(vaultClientResults)
                .requestFormat(VaultConstants.DATA_TYPE_VAULT_ID)
                .responseFormat(VaultConstants.DATA_TYPE_GIFT_CARD_NUMBER)
                .build();
    }

    private String[] setTokenDataList(List<TokenRequest> tokenRequests) {
        return tokenRequests.stream().map(TokenRequest::getData).toArray(String[]::new);

    }

    private VaultClientResponse getVaultClientResponseForVaultEntriesOf(String requestFormat) {
        ArrayList<VaultClientResult> vaultClientResults = new ArrayList<>();
        vaultClientResults.add(VaultClientResult.builder()
                .requestData("411111111111111")
                .responseData("3CFB3DFA5995CC7681699A692479C047")
                .build()
        );
        return VaultClientResponse.builder().
                requestFormat(requestFormat).
                responseFormat(VaultConstants.REQ_TYPE_VAULT_ID)
                .result(vaultClientResults)
                .build();
    }

    private VaultClientRequest getVaultClientRequestForVaultEntriesOf(String requestFormat) {
        return VaultClientRequest.builder()
                .requestFormat(requestFormat)
                .build();
    }
}