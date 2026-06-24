package com.gap.customer.vaultservice.controller;

import com.gap.customer.vaultservice.error.ErrorEntityBuilder;
import com.gap.customer.vaultservice.error.ErrorEntityCodes;
import com.gap.customer.vaultservice.exception.ValidationException;
import com.gap.customer.vaultservice.models.SearchResponse;
import com.gap.customer.vaultservice.models.TokenResponse;
import com.gap.customer.vaultservice.models.TokenSearchRequest;
import com.gap.customer.vaultservice.models.VaultRequest;
import com.gap.customer.vaultservice.services.TokenService;
import org.junit.jupiter.api.Test;
import org.skyscreamer.jsonassert.JSONAssert;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.RequestBuilder;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static com.gap.customer.vaultservice.util.VaultTestDataUtil.asJsonString;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@WebMvcTest(value = {TokenController.class, ErrorEntityBuilder.class})
public class TokenControllerTest {

    private static final String TOKEN_ENTRIES_PATH = "/token-entries";
    private static final String TOKEN_ENTRIES_SEARCH_PATH = "/token-entries/search";
    private static final String VAULT_ID = "26DD0155DFBB037CCAE71ADBCA67A689";

    @MockBean
    private TokenService tokenService;

    @Autowired
    private MockMvc mockMvc;

    @Test
    void shouldReturnTokensForGivenCreditCardNumbers() throws Exception {
        when(tokenService.createTokenEntries(anyList(), anyMap())).thenReturn(getTokenEntriesResponse());
        RequestBuilder requestBuilder = MockMvcRequestBuilders.post(TOKEN_ENTRIES_PATH)
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.APPLICATION_JSON)
                .content(asJsonString(getTokenEntriesRequest()));
        String expectedResponse = "[{\"token\":\"4111111111111111\", \"vaultId\":\"327FAE3EC05ADC6796612538F4036603\",\"index\": 0}, {\"token\":\"4111111111111112\", \"vaultId\":\"397B633BAFBA455C7EB91D299139F5FA\",\"index\": 1}]";

        MvcResult result = mockMvc.perform(requestBuilder).andReturn();
        MockHttpServletResponse response = result.getResponse();

        assertEquals(HttpStatus.OK.value(), response.getStatus());
        JSONAssert.assertEquals(expectedResponse, response.getContentAsString(), false);
    }

    @Test
    void shouldReturnErrorWhenIndexesAreNotUniqueInTokenEntriesRequest() throws Exception {
        ValidationException validationException = new ValidationException(ErrorEntityCodes.INDEXES_NOT_UNIQUE);

        when(tokenService.createTokenEntries(any(List.class), any(Map.class))).thenThrow(validationException);
        RequestBuilder requestBuilder = MockMvcRequestBuilders.post(TOKEN_ENTRIES_PATH)
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.APPLICATION_JSON)
                .content(asJsonString(getTokenEntriesRequestWithNonUniqueIndexes()));
        String expectedResponse = "{\"developerMessage\":null, \"userMessage\": \"Indexes are not unique.\", \"errorCode\": 1, \"moreInfo\": null}";

        MvcResult result = mockMvc.perform(requestBuilder).andReturn();
        MockHttpServletResponse response = result.getResponse();

        assertEquals(HttpStatus.BAD_REQUEST.value(), response.getStatus());
        JSONAssert.assertEquals(expectedResponse, response.getContentAsString(), false);
    }

    @Test
    void shouldReturnErrorForInvalidDataTypeInTokenEntriesRequest() throws Exception {
        ValidationException validationException = new ValidationException(ErrorEntityCodes.INVALID_VALUE_TYPE);

        when(tokenService.createTokenEntries(any(List.class), any(Map.class))).thenThrow(validationException);
        RequestBuilder requestBuilder = MockMvcRequestBuilders.post(TOKEN_ENTRIES_PATH)
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.APPLICATION_JSON)
                .content(asJsonString(getTokenEntriesRequestWithInvalidDataType()));
        String expectedResponse = "{\"developerMessage\":null, \"userMessage\": \"Some types are invalid.\", \"errorCode\": 2, \"moreInfo\": null}";

        MvcResult result = mockMvc.perform(requestBuilder).andReturn();
        MockHttpServletResponse response = result.getResponse();

        assertEquals(HttpStatus.BAD_REQUEST.value(), response.getStatus());
        JSONAssert.assertEquals(expectedResponse, response.getContentAsString(), false);
    }

    @Test
    void shouldReturnErrorForMissingInputDataInTokenEntriesRequest() throws Exception {
        ValidationException validationException = new ValidationException(ErrorEntityCodes.INPUT_DATA_MISSING);

        when(tokenService.createTokenEntries(any(List.class), any(Map.class))).thenThrow(validationException);
        RequestBuilder requestBuilder = MockMvcRequestBuilders.post(TOKEN_ENTRIES_PATH)
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.APPLICATION_JSON)
                .content(asJsonString(getTokenEntriesRequestWithMissingInputData()));
        String expectedResponse = "{\"developerMessage\":null, \"userMessage\": \"Index, type or plaintext is missing.\", \"errorCode\": 3, \"moreInfo\": null}";

        MvcResult result = mockMvc.perform(requestBuilder).andReturn();
        MockHttpServletResponse response = result.getResponse();

        assertEquals(HttpStatus.BAD_REQUEST.value(), response.getStatus());
        JSONAssert.assertEquals(expectedResponse, response.getContentAsString(), false);
    }

    @Test
    void shouldReturnErrorForInvalidCreditCardLengthInTokenEntriesRequest() throws Exception {
        ValidationException validationException = new ValidationException(ErrorEntityCodes.INVALID_CREDIT_CARD_LENGTH);

        when(tokenService.createTokenEntries(any(List.class), any(Map.class))).thenThrow(validationException);
        RequestBuilder requestBuilder = MockMvcRequestBuilders.post(TOKEN_ENTRIES_PATH)
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.APPLICATION_JSON)
                .content(asJsonString(getTokenEntriesRequestWithInvalidCreditCardLength()));
        String expectedResponse = "{\"developerMessage\":null, \"userMessage\": \"Invalid credit card length - maximum allowed length is 20 and minimum allowed length is 13.\", " +
                "\"errorCode\": 11, \"moreInfo\": \"Please enter valid credit card number\"}";

        MvcResult result = mockMvc.perform(requestBuilder).andReturn();
        MockHttpServletResponse response = result.getResponse();

        assertEquals(HttpStatus.BAD_REQUEST.value(), response.getStatus());
        JSONAssert.assertEquals(expectedResponse, response.getContentAsString(), false);
    }

    @Test
    void shouldReturnErrorForInvalidCreditCardNumberInTokenEntriesRequest() throws Exception {
        ValidationException validationException = new ValidationException(ErrorEntityCodes.INVALID_CREDIT_CARD);

        when(tokenService.createTokenEntries(any(List.class), any(Map.class))).thenThrow(validationException);
        RequestBuilder requestBuilder = MockMvcRequestBuilders.post(TOKEN_ENTRIES_PATH)
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.APPLICATION_JSON)
                .content(asJsonString(getTokenEntriesRequestWithInvalidCreditCardNumber()));
        String expectedResponse = "{\"developerMessage\":null, \"userMessage\": \"Some credit card numbers are invalid.\", " +
                "\"errorCode\": 5, \"moreInfo\": null}";

        MvcResult result = mockMvc.perform(requestBuilder).andReturn();
        MockHttpServletResponse response = result.getResponse();

        assertEquals(HttpStatus.BAD_REQUEST.value(), response.getStatus());
        JSONAssert.assertEquals(expectedResponse, response.getContentAsString(), false);
    }

    @Test
    void shouldReturnVaultIdsForGivenTokens() throws Exception {
        when(tokenService.searchTokenEntriesByToken(any(List.class), any(Map.class))).thenReturn(getTokenEntriesSearchResponse());
        RequestBuilder requestBuilder = MockMvcRequestBuilders.post(TOKEN_ENTRIES_SEARCH_PATH)
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.APPLICATION_JSON)
                .content(asJsonString(getTokenEntriesRequest()));
        String expectedResponse = "[{\"responseData\": \"327FAE3EC05ADC6796612538F4036603\",\"index\": 0},{\"responseData\": \"397B633BAFBA455C7EB91D299139F5FA\",\"index\": 1}]";
        MvcResult result = mockMvc.perform(requestBuilder).andReturn();
        MockHttpServletResponse response = result.getResponse();

        assertEquals(HttpStatus.OK.value(), response.getStatus());
        JSONAssert.assertEquals(expectedResponse, response.getContentAsString(), false);
    }

    @Test
    void shouldReturnErrorWhenIndexesAreNotUniqueInTokenEntriesSearchRequest() throws Exception {
        ValidationException validationException = new ValidationException(ErrorEntityCodes.INDEXES_NOT_UNIQUE);

        when(tokenService.searchTokenEntriesByToken(any(List.class), any(Map.class))).thenThrow(validationException);
        RequestBuilder requestBuilder = MockMvcRequestBuilders.post(TOKEN_ENTRIES_SEARCH_PATH)
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.APPLICATION_JSON)
                .content(asJsonString(getTokenSearchRequestWithNonUniqueIndexes()));
        String expectedResponse = "{\"developerMessage\":null, \"userMessage\": \"Indexes are not unique.\", \"errorCode\": 1, \"moreInfo\": null}";

        MvcResult result = mockMvc.perform(requestBuilder).andReturn();
        MockHttpServletResponse response = result.getResponse();

        assertEquals(HttpStatus.BAD_REQUEST.value(), response.getStatus());
        JSONAssert.assertEquals(expectedResponse, response.getContentAsString(), false);
    }

    @Test
    void shouldReturnErrorForInvalidReturnTypeInTokenEntriesSearchRequest() throws Exception {
        ValidationException validationException = new ValidationException(ErrorEntityCodes.INVALID_RETURN_TYPE);

        when(tokenService.searchTokenEntriesByToken(any(List.class), any(Map.class))).thenThrow(validationException);
        RequestBuilder requestBuilder = MockMvcRequestBuilders.post(TOKEN_ENTRIES_SEARCH_PATH)
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.APPLICATION_JSON)
                .content(asJsonString(getTokenSearchRequestWithInvalidDataType()));
        String expectedResponse = "{\"developerMessage\":null, \"userMessage\": \"Some return types are invalid\", \"errorCode\": 15, \"moreInfo\": null}";

        MvcResult result = mockMvc.perform(requestBuilder).andReturn();
        MockHttpServletResponse response = result.getResponse();

        assertEquals(HttpStatus.BAD_REQUEST.value(), response.getStatus());
        JSONAssert.assertEquals(expectedResponse, response.getContentAsString(), false);
    }

    @Test
    void shouldReturnErrorForMissingInputDataInTokenEntriesSearchRequest() throws Exception {
        ValidationException validationException = new ValidationException(ErrorEntityCodes.INPUT_DATA_MISSING);

        when(tokenService.searchTokenEntriesByToken(any(List.class), any(Map.class))).thenThrow(validationException);
        RequestBuilder requestBuilder = MockMvcRequestBuilders.post(TOKEN_ENTRIES_SEARCH_PATH)
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.APPLICATION_JSON)
                .content(asJsonString(getTokenSearchRequestWithMissingInputData()));
        String expectedResponse = "{\"developerMessage\":null, \"userMessage\": \"Index, type or plaintext is missing.\", \"errorCode\": 3, \"moreInfo\": null}";

        MvcResult result = mockMvc.perform(requestBuilder).andReturn();
        MockHttpServletResponse response = result.getResponse();

        assertEquals(HttpStatus.BAD_REQUEST.value(), response.getStatus());
        JSONAssert.assertEquals(expectedResponse, response.getContentAsString(), false);
    }

    @Test
    void shouldReturnErrorForMissingInputDataAndReturnTypeInTokenEntriesSearchRequest() throws Exception {
        ValidationException validationException = new ValidationException(ErrorEntityCodes.INPUT_DATA_MISSING);

        when(tokenService.searchTokenEntriesByToken(any(List.class), any(Map.class))).thenThrow(validationException);
        RequestBuilder requestBuilder = MockMvcRequestBuilders.post(TOKEN_ENTRIES_SEARCH_PATH)
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.APPLICATION_JSON)
                .content(asJsonString(getTokenSearchRequestWithMissingInputDataAndMissingReturnType()));
        String expectedResponse = "{\"developerMessage\":null, \"userMessage\": \"Index, type or plaintext is missing.\", \"errorCode\": 3, \"moreInfo\": null}";

        MvcResult result = mockMvc.perform(requestBuilder).andReturn();
        MockHttpServletResponse response = result.getResponse();

        assertEquals(HttpStatus.BAD_REQUEST.value(), response.getStatus());
        JSONAssert.assertEquals(expectedResponse, response.getContentAsString(), false);
    }

    @Test
    void shouldReturnErrorForInvalidTokenLengthInTokenEntriesSearchRequest() throws Exception {
        ValidationException validationException = new ValidationException(ErrorEntityCodes.INVALID_TOKEN_LENGTH);

        when(tokenService.searchTokenEntriesByToken(any(List.class), any(Map.class))).thenThrow(validationException);
        RequestBuilder requestBuilder = MockMvcRequestBuilders.post(TOKEN_ENTRIES_SEARCH_PATH)
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.APPLICATION_JSON)
                .content(asJsonString(getTokenSearchRequestWithInvalidTokenLength()));
        String expectedResponse = "{\"developerMessage\":null, \"userMessage\": \"Invalid token length - Maxium allowed length is 20 and Minimum allowed length is 13.\", " +
                "\"errorCode\": 7, \"moreInfo\": null}";

        MvcResult result = mockMvc.perform(requestBuilder).andReturn();
        MockHttpServletResponse response = result.getResponse();

        assertEquals(HttpStatus.BAD_REQUEST.value(), response.getStatus());
        JSONAssert.assertEquals(expectedResponse, response.getContentAsString(), false);
    }

    @Test
    void shouldReturnErrorForInvalidTokenInTokenEntriesSearchRequest() throws Exception {
        ValidationException validationException = new ValidationException(ErrorEntityCodes.INVALID_TOKEN_DATA);

        when(tokenService.searchTokenEntriesByToken(any(List.class), any(Map.class))).thenThrow(validationException);
        RequestBuilder requestBuilder = MockMvcRequestBuilders.post(TOKEN_ENTRIES_SEARCH_PATH)
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.APPLICATION_JSON)
                .content(asJsonString(getTokenSearchRequestWithInvalidToken()));
        String expectedResponse = "{\"developerMessage\":null, \"userMessage\": \"Some tokens are invalid. Only digits are allowed\", " +
                "\"errorCode\": 16, \"moreInfo\": null}";

        MvcResult result = mockMvc.perform(requestBuilder).andReturn();
        MockHttpServletResponse response = result.getResponse();

        assertEquals(HttpStatus.BAD_REQUEST.value(), response.getStatus());
        JSONAssert.assertEquals(expectedResponse, response.getContentAsString(), false);
    }

    @Test
    void shouldReturnTokenSearchResponseWithVaultIdAndVoltageTokenForGivenBluefinTokenInfo() throws Exception {
        TokenSearchRequest tokenSearchRequest = getTokenSearchRequestFor(
                "4111111111111111",
                "BFID_1",
                0);
        List<TokenSearchRequest> tokenSearchRequests = List.of(tokenSearchRequest);
        when(tokenService.searchTokenEntriesByToken(eq(tokenSearchRequests), anyMap()))
                .thenReturn(getTokenEntriesSearchResponseForBluefinToken());
        RequestBuilder requestBuilder = MockMvcRequestBuilders.post(TOKEN_ENTRIES_SEARCH_PATH)
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.APPLICATION_JSON)
                .content(asJsonString(tokenSearchRequests));
        String expectedResponse = "[{\"responseData\":\"26DD0155DFBB037CCAE71ADBCA67A689\",\"token\":\"voltageToken\",\"index\":0}]";

        MvcResult result = mockMvc.perform(requestBuilder).andReturn();
        MockHttpServletResponse response = result.getResponse();

        assertEquals(HttpStatus.OK.value(), response.getStatus());
        JSONAssert.assertEquals(expectedResponse, response.getContentAsString(), false);
    }

    private TokenSearchRequest getTokenSearchRequestFor(String token, String tokenId, int index) {
        return TokenSearchRequest.builder()
                .index(index)
                .returnType("VaultId")
                .token(token)
                .tokenId(tokenId)
                .build();
    }

    private SearchResponse getTokenSearchResponseFor(String responseData, String token, String tokenId, int index) {
        return SearchResponse.builder()
                .index(index)
                .responseData(responseData)
                .token(token)
                .tokenId(tokenId)
                .build();
    }

    private ResponseEntity<List<SearchResponse>> getTokenEntriesSearchResponseForBluefinToken() {
        List<SearchResponse> tokenSearchResponses = List.of(getTokenSearchResponseFor(
                VAULT_ID,
                "voltageToken",
                null, 0)
        );
        return new ResponseEntity<>(tokenSearchResponses, HttpStatus.OK);
    }

    private ResponseEntity<List<SearchResponse>> getTokenEntriesSearchResponse() {
        List<SearchResponse> tokenSearchResponses = new ArrayList<>();
        tokenSearchResponses.add(SearchResponse.builder().responseData("327FAE3EC05ADC6796612538F4036603").index(0).build());
        tokenSearchResponses.add(SearchResponse.builder().responseData("397B633BAFBA455C7EB91D299139F5FA").index(1).build());
        return new ResponseEntity(tokenSearchResponses, setResponseHeaders(), HttpStatus.OK);
    }

    private ResponseEntity<List<TokenResponse>> getTokenEntriesResponse() {
        List<TokenResponse> tokenResponses = new ArrayList<>();
        tokenResponses.add(TokenResponse.builder().token("4111111111111111").vaultId("327FAE3EC05ADC6796612538F4036603").index(0).build());
        tokenResponses.add(TokenResponse.builder().token("4111111111111112").vaultId("397B633BAFBA455C7EB91D299139F5FA").index(1).build());
        return new ResponseEntity<>(tokenResponses, setResponseHeaders(), HttpStatus.OK);
    }

    private List<VaultRequest> getTokenEntriesRequest() {
        List<VaultRequest> tokenResponses = new ArrayList<>();
        tokenResponses.add(VaultRequest.builder().type("CREDIT_CARD_NUMBER").plaintext("4111110024511111").index(0).build());
        tokenResponses.add(VaultRequest.builder().type("CREDIT_CARD_NUMBER").plaintext("4111118681411112").index(1).build());
        return tokenResponses;
    }

    private List<VaultRequest> getTokenEntriesRequestWithNonUniqueIndexes() {
        List<VaultRequest> tokenRequests = new ArrayList<>();
        tokenRequests.add(VaultRequest.builder().type("CREDIT_CARD_NUMBER").plaintext("4111110024511111").index(0).build());
        tokenRequests.add(VaultRequest.builder().type("CREDIT_CARD_NUMBER").plaintext("4111118681411112").index(0).build());
        return tokenRequests;
    }

    private List<TokenSearchRequest> getTokenSearchRequestWithNonUniqueIndexes() {
        List<TokenSearchRequest> tokenSearchRequests = new ArrayList<>();
        tokenSearchRequests.add(TokenSearchRequest.builder().returnType("VAULT_ID").token("4111111111111112").index(0).build());
        tokenSearchRequests.add(TokenSearchRequest.builder().returnType("VAULT_ID").token("4111111111111113").index(0).build());
        return tokenSearchRequests;
    }

    private List<VaultRequest> getTokenEntriesRequestWithInvalidDataType() {
        List<VaultRequest> tokenEntriesRequests = new ArrayList<>();
        tokenEntriesRequests.add(VaultRequest.builder().type("CREDIT_CARD_NUMBER_1").plaintext("4111110024511111").index(0).build());
        return tokenEntriesRequests;
    }

    private List<TokenSearchRequest> getTokenSearchRequestWithInvalidDataType() {
        List<TokenSearchRequest> tokenSearchRequests = new ArrayList<>();
        tokenSearchRequests.add(TokenSearchRequest.builder().returnType("CREDIT_CARD_NUMBER").token("4111111111111112").index(0).build());
        return tokenSearchRequests;
    }

    private List<VaultRequest> getTokenEntriesRequestWithMissingInputData() {
        List<VaultRequest> tokenEntriesRequests = new ArrayList<>();
        tokenEntriesRequests.add(VaultRequest.builder().type("CREDIT_CARD_NUMBER").index(0).build());
        return tokenEntriesRequests;
    }

    private List<TokenSearchRequest> getTokenSearchRequestWithMissingInputData() {
        List<TokenSearchRequest> tokenSearchRequests = new ArrayList<>();
        tokenSearchRequests.add(TokenSearchRequest.builder().returnType("VAULT_ID").index(0).build());
        return tokenSearchRequests;
    }

    private List<TokenSearchRequest> getTokenSearchRequestWithMissingInputDataAndMissingReturnType() {
        List<TokenSearchRequest> tokenSearchRequests = new ArrayList<>();
        tokenSearchRequests.add(TokenSearchRequest.builder().index(0).build());
        return tokenSearchRequests;
    }

    private List<VaultRequest> getTokenEntriesRequestWithInvalidCreditCardLength() {
        List<VaultRequest> tokenEntriesRequests = new ArrayList<>();
        tokenEntriesRequests.add(VaultRequest.builder().type("CREDIT_CARD_NUMBER").plaintext("411111002451").index(0).build());
        return tokenEntriesRequests;
    }

    private List<VaultRequest> getTokenEntriesRequestWithInvalidCreditCardNumber() {
        List<VaultRequest> tokenEntriesRequests = new ArrayList<>();
        tokenEntriesRequests.add(VaultRequest.builder().type("CREDIT_CARD_NUMBER").plaintext("411111002A2111B1").index(0).build());
        return tokenEntriesRequests;
    }

    private List<TokenSearchRequest> getTokenSearchRequestWithInvalidTokenLength() {
        List<TokenSearchRequest> tokenSearchRequests = new ArrayList<>();
        tokenSearchRequests.add(TokenSearchRequest.builder().returnType("VAULT_ID").token("411111002451").index(0).build());
        return tokenSearchRequests;
    }

    private List<TokenSearchRequest> getTokenSearchRequestWithInvalidToken() {
        List<TokenSearchRequest> tokenSearchRequests = new ArrayList<>();
        tokenSearchRequests.add(TokenSearchRequest.builder().returnType("VAULT_ID").token("411111002A2111B1").index(0).build());
        return tokenSearchRequests;
    }

    private HttpHeaders setResponseHeaders() {
        HttpHeaders responseHeaders = new HttpHeaders();
        responseHeaders.set("Strict-Transport-Security", "max-age=31536000;includeSubDomains");
        responseHeaders.set("Cache-Control", "no-store");
        responseHeaders.set("Pragma", "no-cache");
        responseHeaders.set("X-Frame-Options", "DENY");
        return responseHeaders;
    }
}
