package com.gap.customer.vaultservice.services.Impl;

import com.gap.customer.vaultservice.Validators.VaultEntryServiceValidator;
import com.gap.customer.vaultservice.controller.TraceHeaders;
import com.gap.customer.vaultservice.error.ErrorCodes;
import com.gap.customer.vaultservice.error.ErrorEntity;
import com.gap.customer.vaultservice.error.ErrorEntityInternal;
import com.gap.customer.vaultservice.error.ErrorEntityMessage;
import com.gap.customer.vaultservice.exception.ValidationException;
import com.gap.customer.vaultservice.exception.VaultServiceException;
import com.gap.customer.vaultservice.models.SearchResponse;
import com.gap.customer.vaultservice.models.TokenRequest;
import com.gap.customer.vaultservice.models.TokenResponse;
import com.gap.customer.vaultservice.models.TokenSearchRequest;
import com.gap.customer.vaultservice.models.VaultClientRequest;
import com.gap.customer.vaultservice.models.VaultFeatureToggle;
import com.gap.customer.vaultservice.models.VaultRequest;
import com.gap.customer.vaultservice.services.VaultClientRequestBuilder;
import com.gap.customer.vaultservice.services.VaultClientResponseBuilder;
import com.gap.customer.vaultservice.services.VaultClientService;
import com.gap.customer.vaultservice.util.VaultConstants;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.junit.jupiter.SpringExtension;

import javax.servlet.http.HttpServletRequest;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static com.gap.customer.vaultservice.util.VaultConstants.HTTP_STATUS_BAD_REQUEST;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.when;

@ExtendWith(SpringExtension.class)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
public class TokenServiceImplTest {

    @Mock
    private VaultClientRequestBuilder vaultClientRequestBuilder;

    @Mock
    private VaultClientResponseBuilder vaultClientResponseBuilder;

    @Mock
    private VaultClientService vaultClientService;

    @Mock
    private HttpServletRequest httpServletRequest;

    @Mock
    private ClientMediator clientMediator;

    @Mock
    private VaultFeatureToggle vaultFeatureToggle;

    private TokenServiceImpl tokenService;


    @Mock
    private VaultEntryServiceValidator vaultEntryServiceValidator;

    @BeforeEach
    public void setUp() {
        MockitoAnnotations.openMocks(this);
        tokenService = new TokenServiceImpl(vaultClientRequestBuilder, vaultClientResponseBuilder,
                vaultClientService, vaultFeatureToggle, clientMediator, vaultEntryServiceValidator);
    }

// TODO: remove ?
//    @Test
//    public void testValidCreateTokenRequestByTokens() throws VaultServiceException{
//
//        when(vaultClientRequestBuilder.buildVaultClientRequestForTokens(
//                anyList())).thenReturn(createVaultClientRequest());
//
//        when(vaultClientResponseBuilder.buildResponsesForTokens(
//                anyList(), any())).thenReturn(getVaultTokenResponse());
//
//        tokenService.createTokens(createTokenRequest(),getHeadersFromRequest(httpServletRequest));
//        Assertions.assertEquals("CreditCardNumber", vaultClientRequest.getRequestFormat());
//    }

    @Test
    public void testValidCreateTokenEntryByVaultRequest() throws VaultServiceException {

        when(vaultClientRequestBuilder.buildVaultClientRequestForTokenEntries(
                anyList())).thenReturn(createVaultClientRequest());
        when(clientMediator.mapperForTokenEntries(any(), any())).thenReturn(getVaultTokenResponse());

        ResponseEntity<List<TokenResponse>> tokenResponses = tokenService.createTokenEntries(createVaultRequest(), getHeadersFromRequest(httpServletRequest));

        assertEquals(2, tokenResponses.getBody().size());
        assertEquals(getVaultTokenResponse(), tokenResponses.getBody());
    }


    @Test
    public void shouldReturnTokensForTwoCreditCardNumbers() throws VaultServiceException {
        List<String> creditCardNumbers = new ArrayList<>();
        creditCardNumbers.add("4479951709255127");
        creditCardNumbers.add("4479951709255134");
        List<VaultRequest> vaultRequestForCreditCardNumbers = getVaultRequestForCreditCardNumbers(creditCardNumbers);

        Map<String, String> headers = new HashMap<>();
        when(clientMediator.mapperForTokenEntries(anyList(), any())).thenReturn(getListOfTokenResponse());
        ResponseEntity<List<TokenResponse>> expectedResponse = new ResponseEntity(getListOfTokenResponse(), setResponseHeaders(), HttpStatus.OK);

        ResponseEntity<List<TokenResponse>> response = tokenService.createTokenEntries(vaultRequestForCreditCardNumbers, headers);

        assertEquals(2, response.getBody().size());
        assertEquals(expectedResponse, response);
    }

    @Test
    public void testValidSearchTokenRequestByTokenWhenLegacyIsEnabled() throws VaultServiceException {
        when(vaultFeatureToggle.isLegacyCloud()).thenReturn(true);
        when(vaultClientRequestBuilder.buildVaultClientRequestsForTokenSearch(
                anyList())).thenReturn(createVaultTokenSearchClientRequest());

        when(vaultClientResponseBuilder.buildResponsesForTokenSearch(
                anyList(), any())).thenReturn(getVaultSearchTokenResponse());
        ResponseEntity<List<SearchResponse>> expectedResponse = new ResponseEntity(getVaultSearchTokenResponse(), setResponseHeaders(), HttpStatus.OK);

        ResponseEntity<List<SearchResponse>> response = tokenService.searchTokenEntriesByToken(createVaultTokenSearchRequest(), getHeadersFromRequest(httpServletRequest));
        assertEquals(2, response.getBody().size());
        assertEquals(expectedResponse, response);
    }

    @Test
    public void testValidSearchTokenRequestByTokenWhenLegacyIsDisabled() throws VaultServiceException {
        when(clientMediator.mapperForTokenEntriesSearch(any(), any())).thenReturn(getVaultSearchTokenResponse());
        ResponseEntity<List<SearchResponse>> expectedResponse = new ResponseEntity(getVaultSearchTokenResponse(), setResponseHeaders(), HttpStatus.OK);

        ResponseEntity<List<SearchResponse>> response = tokenService.searchTokenEntriesByToken(createVaultTokenSearchRequest(), getHeadersFromRequest(httpServletRequest));
        assertEquals(2, response.getBody().size());
        assertEquals(expectedResponse, response);
    }

    @Test
    public void searchTokenEntriesByTokenShouldThrowErrorIfDataTypeIsMissing() throws VaultServiceException {

        List<TokenSearchRequest> tokenRequests = getTokenSearchRequestsForMissingDataType();
        VaultServiceException vaultServiceException = new ValidationException(new ErrorEntityInternal(HTTP_STATUS_BAD_REQUEST,
                new ErrorEntity(null, ErrorEntityMessage.INPUT_DATA_MISSING_USERMESSAGE,
                        Integer.valueOf(ErrorCodes.INPUT_DATA_MISSING), null)));
        when(vaultEntryServiceValidator.isValidsearchVaultIdbyToken(
                anyList())).thenThrow(vaultServiceException);

        VaultServiceException actualResult = assertThrows(VaultServiceException.class, () ->
                tokenService.searchTokenEntriesByToken(tokenRequests, getHeadersFromRequest(httpServletRequest)));
        assertEquals(ErrorEntityMessage.INPUT_DATA_MISSING_USERMESSAGE, actualResult.getErrorEntityInternal().getErrorEntity().getUserMessage());
    }


    @Test
    public void searchTokenEntriesByTokenShouldThrowErrorIfTokenIsMissing() throws VaultServiceException {

        List<TokenSearchRequest> tokenRequests = getTokenSearchRequestsMissingToken();
        VaultServiceException vaultServiceException = new ValidationException(new ErrorEntityInternal(HTTP_STATUS_BAD_REQUEST,
                new ErrorEntity(null, ErrorEntityMessage.INPUT_DATA_MISSING_USERMESSAGE,
                        Integer.valueOf(ErrorCodes.INPUT_DATA_MISSING), null)));
        when(vaultEntryServiceValidator.isValidsearchVaultIdbyToken(
                anyList())).thenThrow(vaultServiceException);

        VaultServiceException actualResult = assertThrows(VaultServiceException.class, () ->
                tokenService.searchTokenEntriesByToken(tokenRequests, getHeadersFromRequest(httpServletRequest)));
        assertEquals(ErrorEntityMessage.INPUT_DATA_MISSING_USERMESSAGE, actualResult.getErrorEntityInternal().getErrorEntity().getUserMessage());
    }


    @Test
    public void searchTokenEntriesByTokenShouldThrowErrorIfItHasDuplicateIndex() throws VaultServiceException {

        List<TokenSearchRequest> tokenRequests = getTokenSearchRequestsWithDuplicateIndex();
        VaultServiceException vaultServiceException = new ValidationException(new ErrorEntityInternal(HTTP_STATUS_BAD_REQUEST,
                new ErrorEntity(null, ErrorEntityMessage.INDEXES_NOT_UNIQUE_USERMESSAGE,
                        Integer.valueOf(ErrorCodes.INDEXES_NOT_UNIQUE), null)));

        when(vaultEntryServiceValidator.isValidsearchVaultIdbyToken(
                anyList())).thenThrow(vaultServiceException);

        VaultServiceException actualResult = assertThrows(VaultServiceException.class, () ->
                tokenService.searchTokenEntriesByToken(tokenRequests, getHeadersFromRequest(httpServletRequest)));
        assertEquals(ErrorEntityMessage.INDEXES_NOT_UNIQUE_USERMESSAGE, actualResult.getErrorEntityInternal().getErrorEntity().getUserMessage());
    }


    @Test
    public void searchTokenEntriesByTokenShouldThrowErrorIfItHasInvalidToken() throws VaultServiceException {

        List<TokenSearchRequest> tokenRequests = getTokenSearchRequestsWithInvalidToken();
        VaultServiceException vaultServiceException = new ValidationException(new ErrorEntityInternal(HTTP_STATUS_BAD_REQUEST,
                new ErrorEntity(null, ErrorEntityMessage.INVALID_TOKEN_DATA_MESSAGE,
                        Integer.valueOf(ErrorCodes.INVALID_TOKEN), null)));

        when(vaultEntryServiceValidator.isValidsearchVaultIdbyToken(
                anyList())).thenThrow(vaultServiceException);

        VaultServiceException actualResult = assertThrows(VaultServiceException.class, () ->
                tokenService.searchTokenEntriesByToken(tokenRequests, getHeadersFromRequest(httpServletRequest)));
        assertEquals(ErrorEntityMessage.INVALID_TOKEN_DATA_MESSAGE, actualResult.getErrorEntityInternal().getErrorEntity().getUserMessage());
    }


    @Test
    public void searchTokenEntriesByTokenShouldThrowErrorIfItHasInvalidTokenLength() throws VaultServiceException {

        List<TokenSearchRequest> tokenRequests = getTokenSearchRequestsWithInvalidTokenLength();
        VaultServiceException vaultServiceException = new ValidationException(new ErrorEntityInternal(HTTP_STATUS_BAD_REQUEST,
                new ErrorEntity(null, ErrorEntityMessage.INVALID_TOKEN_LEN_MESSAGE,
                        Integer.valueOf(ErrorCodes.INVALID_TOKEN_LENGTH), null)));
        when(vaultEntryServiceValidator.isValidsearchVaultIdbyToken(
                anyList())).thenThrow(vaultServiceException);

        VaultServiceException actualResult = assertThrows(VaultServiceException.class, () ->
                tokenService.searchTokenEntriesByToken(tokenRequests, getHeadersFromRequest(httpServletRequest)));
        assertEquals(ErrorEntityMessage.INVALID_TOKEN_LEN_MESSAGE, actualResult.getErrorEntityInternal().getErrorEntity().getUserMessage());
    }


    @Test
    public void searchTokenEntriesByTokenShouldThrowErrorIfItHasBothReturnTypeAndTokenMissing() throws VaultServiceException {

        List<TokenSearchRequest> tokenRequests = getTokenSearchRequestsWithMissingReturnTypeAndToken();
        VaultServiceException vaultServiceException = new ValidationException(new ErrorEntityInternal(HTTP_STATUS_BAD_REQUEST,
                new ErrorEntity(null, ErrorEntityMessage.INPUT_DATA_MISSING_FOR_VAULTID_USERMESSAGE,
                        Integer.valueOf(ErrorCodes.INPUT_DATA_MISSING), null)));
        when(vaultEntryServiceValidator.isValidsearchVaultIdbyToken(
                anyList())).thenThrow(vaultServiceException);

        VaultServiceException actualResult = assertThrows(VaultServiceException.class, () ->
                tokenService.searchTokenEntriesByToken(tokenRequests, getHeadersFromRequest(httpServletRequest)));
        assertEquals(ErrorEntityMessage.INPUT_DATA_MISSING_FOR_VAULTID_USERMESSAGE, actualResult.getErrorEntityInternal().getErrorEntity().getUserMessage());
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

    private List<VaultRequest> getVaultRequestForCreditCardNumbers(List<String> creditCardNumbers) {
        List<VaultRequest> vaultRequests = new ArrayList<>();
        int index = 0;
        for (String creditCardNumber : creditCardNumbers) {
            VaultRequest vaultRequest = VaultRequest.builder()
                    .type("CREDIT_CARD_NUMBER")
                    .index(index++)
                    .plaintext(creditCardNumber)
                    .build();
            vaultRequests.add(vaultRequest);
        }


        return vaultRequests;
    }

    private VaultClientRequest createVaultTokenSearchClientRequest() {
        List<TokenSearchRequest> tokenRequests = new ArrayList<>();
        TokenSearchRequest tokenRequest1 = TokenSearchRequest.builder()
                .returnType("VAULT_ID")
                .index(0)
                .token("4479951709255127")
                .build();

        TokenSearchRequest tokenRequest2 = TokenSearchRequest.builder()
                .returnType("VAULT_ID")
                .index(1)
                .token("4489951947255128")
                .build();

        tokenRequests.add(tokenRequest1);
        tokenRequests.add(tokenRequest2);

        return VaultClientRequest.builder()
                .responseFormat(VaultConstants.DATA_TYPE_TOKEN)
                .requestFormat("VAULT_ID")
                .requestData(setTokensList(tokenRequests))
                .build();

    }

    private List<TokenSearchRequest> createVaultTokenSearchRequest() {
        List<TokenSearchRequest> tokenRequests = new ArrayList<>();
        TokenSearchRequest tokenRequest1 = getTokenSearchRequestFor("4479951709255127", null, 0);
        TokenSearchRequest tokenRequest2 = getTokenSearchRequestFor("4489951947255128", "BFID_1", 1);

        tokenRequests.add(tokenRequest1);
        tokenRequests.add(tokenRequest2);

        return tokenRequests;
    }

    private TokenSearchRequest getTokenSearchRequestFor(String token, String tokenId, int index) {
        return TokenSearchRequest.builder()
                .index(index)
                .returnType("VAULT_ID")
                .token(token)
                .tokenId(tokenId)
                .build();
    }

    private List<TokenResponse> getListOfTokenResponse() {
        List<TokenResponse> tokenResponses = new ArrayList<>();
        TokenResponse tokenResponse1 = TokenResponse.builder()
                .token("4479950329695127")
                .bfToken("4479952618035127")
                .tokenId("djI6MTIwMjIwMjI0MDYzNTM1MTAzMzY1NjUwMyMwfGJjNWQwNTdiNTAzOTIwMDc3YmRmMGJmYTc4NWFhZTZmfHx8")
                .index(0)
                .build();
        TokenResponse tokenResponse2 = TokenResponse.builder()
                .token("4479950625605128")
                .bfToken("4479952618035128")
                .tokenId("djI6MTIwMjIwMjI0MDYzNTM1MTAzMzY1NjUwMyMxfGJjNWQwNTdiNTAzOTIwMDc3YmRmMGJmYTc4NWFhZTZmfHx8")
                .index(1)
                .build();
        tokenResponses.add(tokenResponse1);
        tokenResponses.add(tokenResponse2);
        return tokenResponses;
    }

    private List<VaultRequest> createVaultRequest() {
        List<VaultRequest> vaultRequests = new ArrayList<>();

        VaultRequest vaultRequest1 = VaultRequest.builder()
                .plaintext("4479951709255127")
                .index(0)
                .type("CREDIT_CARD_NUMBER")
                .build();

        VaultRequest vaultRequest2 = VaultRequest.builder()
                .plaintext("4489951947255128")
                .index(1)
                .type("CREDIT_CARD_NUMBER")
                .build();

        vaultRequests.add(vaultRequest1);
        vaultRequests.add(vaultRequest2);

        return vaultRequests;
    }


    private List<TokenResponse> getVaultTokenResponse() {
        List<TokenResponse> tokenResponses = new ArrayList<>();

        TokenResponse tokenResponse1 = TokenResponse.builder()
                .token("4479950329695127")
                .index(0)
                .build();

        TokenResponse tokenResponse2 = TokenResponse.builder()
                .token("4489958470835128")
                .index(1)
                .build();

        tokenResponses.add(tokenResponse1);
        tokenResponses.add(tokenResponse2);

        return tokenResponses;
    }

    private List<SearchResponse> getVaultSearchTokenResponse() {
        List<SearchResponse> searchResponses = new ArrayList<>();

        SearchResponse searchResponse1 = SearchResponse.builder()
                .responseData("5182169FDDEBDEFDAA307E5948B502DA")
                .index(0)
                .build();

        SearchResponse searchResponse2 = SearchResponse.builder()
                .responseData("B0CF82E099A4BD8B8BF8860D3288D938")
                .token("voltageToken")
                .index(1)
                .build();

        searchResponses.add(searchResponse1);
        searchResponses.add(searchResponse2);

        return searchResponses;
    }

    private List<TokenSearchRequest> getTokenSearchRequestsForMissingDataType() {
        List<TokenSearchRequest> tokenRequests = new ArrayList<>();
        TokenSearchRequest tokenRequest1 = TokenSearchRequest.builder()
                .returnType("")
                .index(0)
                .token("4479951709255127")
                .build();

        TokenSearchRequest tokenRequest2 = TokenSearchRequest.builder()
                .returnType("VAULT_ID")
                .index(1)
                .token("4489951947255128")
                .build();

        tokenRequests.add(tokenRequest1);
        tokenRequests.add(tokenRequest2);
        return tokenRequests;
    }

    private List<TokenSearchRequest> getTokenSearchRequestsMissingToken() {
        List<TokenSearchRequest> tokenRequests = new ArrayList<>();
        TokenSearchRequest tokenRequest1 = TokenSearchRequest.builder()
                .returnType("VAULT_ID")
                .index(0)
                .token("")
                .build();

        TokenSearchRequest tokenRequest2 = TokenSearchRequest.builder()
                .returnType("VAULT_ID")
                .index(1)
                .token("4489951947255128")
                .build();

        tokenRequests.add(tokenRequest1);
        tokenRequests.add(tokenRequest2);
        return tokenRequests;
    }

    private List<TokenSearchRequest> getTokenSearchRequestsWithDuplicateIndex() {
        List<TokenSearchRequest> tokenRequests = new ArrayList<>();
        TokenSearchRequest tokenRequest1 = TokenSearchRequest.builder()
                .returnType("VAULT_ID")
                .index(0)
                .token("4489951947255127")
                .build();

        TokenSearchRequest tokenRequest2 = TokenSearchRequest.builder()
                .returnType("VAULT_ID")
                .index(0)
                .token("4489951947255128")
                .build();

        tokenRequests.add(tokenRequest1);
        tokenRequests.add(tokenRequest2);
        return tokenRequests;
    }

    private List<TokenSearchRequest> getTokenSearchRequestsWithInvalidToken() {
        List<TokenSearchRequest> tokenRequests = new ArrayList<>();
        TokenSearchRequest tokenRequest1 = TokenSearchRequest.builder()
                .returnType("VAULT_ID")
                .index(0)
                .token("4489951947255A27")
                .build();

        TokenSearchRequest tokenRequest2 = TokenSearchRequest.builder()
                .returnType("VAULT_ID")
                .index(1)
                .token("4489951947255128")
                .build();

        tokenRequests.add(tokenRequest1);
        tokenRequests.add(tokenRequest2);
        return tokenRequests;
    }

    private List<TokenSearchRequest> getTokenSearchRequestsWithInvalidTokenLength() {
        List<TokenSearchRequest> tokenRequests = new ArrayList<>();
        TokenSearchRequest tokenRequest1 = TokenSearchRequest.builder()
                .returnType("VAULT_ID")
                .index(0)
                .token("448995194725512744899519472551274489951947255127")
                .build();

        TokenSearchRequest tokenRequest2 = TokenSearchRequest.builder()
                .returnType("VAULT_ID")
                .index(1)
                .token("4489951947255128")
                .build();

        tokenRequests.add(tokenRequest1);
        tokenRequests.add(tokenRequest2);
        return tokenRequests;
    }

    private List<TokenSearchRequest> getTokenSearchRequestsWithMissingReturnTypeAndToken() {
        List<TokenSearchRequest> tokenRequests = new ArrayList<>();
        TokenSearchRequest tokenRequest1 = TokenSearchRequest.builder()
                .returnType("")
                .index(0)
                .token("")
                .build();

        TokenSearchRequest tokenRequest2 = TokenSearchRequest.builder()
                .returnType("VAULT_ID")
                .index(1)
                .token("4489951947255128")
                .build();

        tokenRequests.add(tokenRequest1);
        tokenRequests.add(tokenRequest2);
        return tokenRequests;
    }

    private String[] setTokensList(List<TokenSearchRequest> tokenSearchRequests) {
        return tokenSearchRequests.stream()
                .map(TokenSearchRequest::getToken)
                .toArray(String[]::new);
    }

    private String[] setTokenDataList(List<TokenRequest> tokenRequests) {
        return tokenRequests.stream()
                .map(TokenRequest::getData)
                .toArray(String[]::new);

    }

    private HttpHeaders setResponseHeaders() {
        HttpHeaders responseHeaders = new HttpHeaders();
        responseHeaders.set("Strict-Transport-Security", "max-age=31536000;includeSubDomains");
        responseHeaders.set("Cache-Control", "no-store");
        responseHeaders.set("Pragma", "no-cache");
        responseHeaders.set("X-Frame-Options", "DENY");
        return responseHeaders;
    }

    private Map<String, String> getHeadersFromRequest(HttpServletRequest request) {


        Map<String, String> headers = new HashMap<>();
        if (request.getRemoteAddr() != null) {
            headers.put(TraceHeaders.X_FORWARDED_FOR, request.getRemoteAddr());
        }
        if (request.getHeader(TraceHeaders.X_GID_CLIENT_SESSION) != null) {
            headers.put(TraceHeaders.X_GID_CLIENT_SESSION, request.getHeader(TraceHeaders.X_GID_CLIENT_SESSION));
        }
        if (request.getHeader(TraceHeaders.X_APP_NAME) != null) {
            headers.put(TraceHeaders.X_APP_NAME, request.getHeader(TraceHeaders.X_APP_NAME));
        }
        if (request.getHeader(TraceHeaders.X_PREVIEW_HEADER) != null) {
            headers.put(TraceHeaders.X_PREVIEW_HEADER, request.getHeader(TraceHeaders.X_PREVIEW_HEADER));
        }

        return headers;
    }
}