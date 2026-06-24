package com.gap.customer.vaultservice.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gap.customer.vaultservice.error.ErrorCodes;
import com.gap.customer.vaultservice.error.ErrorEntity;
import com.gap.customer.vaultservice.error.ErrorEntityBuilder;
import com.gap.customer.vaultservice.error.ErrorEntityCodes;
import com.gap.customer.vaultservice.error.ErrorEntityInternal;
import com.gap.customer.vaultservice.error.ErrorEntityMessage;
import com.gap.customer.vaultservice.exception.ValidationException;
import com.gap.customer.vaultservice.exception.VaultServiceException;
import com.gap.customer.vaultservice.filters.VaultDataScopeFilter;
import com.gap.customer.vaultservice.models.SearchResponse;
import com.gap.customer.vaultservice.models.VaultDataScopeConfig;
import com.gap.customer.vaultservice.models.VaultRequest;
import com.gap.customer.vaultservice.models.VaultResponse;
import com.gap.customer.vaultservice.models.VaultSearchRequest;
import com.gap.customer.vaultservice.services.VaultService;
import org.junit.jupiter.api.Test;
import org.skyscreamer.jsonassert.JSONAssert;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.RequestBuilder;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

import javax.servlet.http.HttpServletRequest;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;

@WebMvcTest(value = {VaultController.class, VaultDataScopeConfig.class, ErrorEntityBuilder.class})
public class VaultControllerTest {

    private static final String VAULT_ENTRIES_PATH = "/vault-entries";
    private static final String VAULT_ENTRIES_SEARCH_PATH = "/vault-entries/search";

    @MockBean
    private VaultService vaultService;

    @MockBean
    private VaultDataScopeFilter vaultDataScopeFilter;

    @Autowired
    private MockMvc mockMvc;

    @Test
    void shouldReturnVaultIdsForAllGivenDataTypes() throws Exception {
        List<VaultRequest> vaultEntriesRequest = new ArrayList<>();
        vaultEntriesRequest.add(VaultRequest.builder().type("CREDIT_CARD_NUMBER").plaintext("4111110024511111").index(0).build());
        vaultEntriesRequest.add(VaultRequest.builder().type("GIFT_CARD_NUMBER").plaintext("4111118681411112").index(1).build());
        RequestBuilder requestBuilder = getVaultEntriesRequestBuilder(vaultEntriesRequest);
        when(vaultService.createVaultEntries(anyList(), anyMap(), any(Boolean.class))).thenReturn(getVaultEntriesResponse());
        String expectedResponse = "[{\"vaultId\":\"26DD0155DFBB037CCAE71ADBCA67A689\", \"index\": 0}, {\"vaultId\":\"19F741B2F8308AAE8631B7DD5F116B55\", \"index\": 1}]";

        MvcResult result = mockMvc.perform(requestBuilder).andReturn();
        MockHttpServletResponse response = result.getResponse();

        assertEquals(HttpStatus.OK.value(), response.getStatus());
        JSONAssert.assertEquals(expectedResponse, response.getContentAsString(), false);
    }

    @Test
    void shouldReturnInvalidRequestResponseForVaultIds() throws Exception {
        List<VaultRequest> vaultEntriesRequest = new ArrayList<>();
        vaultEntriesRequest.add(VaultRequest.builder().type("GIFT_CARD_NUMBER").plaintext("4111118681411112").index(1).build());
        RequestBuilder requestBuilder = getVaultEntriesRequestBuilder(vaultEntriesRequest);
        when(vaultService.createVaultEntries(anyList(), anyMap(), any(Boolean.class)))
                .thenThrow(new ValidationException(ErrorEntityCodes.INVALID_REQUEST, 1));
        String expectedResponse = "{\"userMessage\":\"Invalid  request\", \"errorCode\": 3}";

        MvcResult result = mockMvc.perform(requestBuilder).andReturn();
        MockHttpServletResponse response = result.getResponse();

        assertEquals(HttpStatus.BAD_REQUEST.value(), response.getStatus());
        JSONAssert.assertEquals(expectedResponse, response.getContentAsString(), false);
    }

    @Test
    void shouldReturnCorrespondingDataForAllGivenVaultIds() throws Exception {
        List<VaultSearchRequest> vaultSearchRequests = new ArrayList<>();
        vaultSearchRequests.add(VaultSearchRequest.builder().index(0).vaultId("4111110024511111").returnType("GIFT_CARD_NUMBER").build());
        vaultSearchRequests.add(VaultSearchRequest.builder().index(1).vaultId("12").returnType("CREDIT_CARD_EXPIRY_MONTH").build());
        RequestBuilder requestBuilder = getVaultEntriesSearchRequestBuilder(vaultSearchRequests);
        doNothing().when(vaultDataScopeFilter).lookUpVaultSearchFilter(anyList(), any(HttpServletRequest.class));
        when(vaultService.searchVaultEntriesByVaultId(anyList(), anyMap())).thenReturn(getVaultEntriesSearchResponse());
        String expectedResponse = "[{\"responseData\":\"4111110024511111\", \"index\": 0}, {\"responseData\":\"4111118681411112\", \"index\": 1}]";

        MvcResult result = mockMvc.perform(requestBuilder).andReturn();
        MockHttpServletResponse response = result.getResponse();

        assertEquals(HttpStatus.OK.value(), response.getStatus());
        JSONAssert.assertEquals(expectedResponse, response.getContentAsString(), false);
    }

    @Test
    void shouldReturnTokenInfoInSearchResponseForVaultEntriesSearchWhenListOfVaultidsAreValid() throws Exception {
        List<VaultSearchRequest> vaultSearchRequests = new ArrayList<>();
        vaultSearchRequests.add(VaultSearchRequest.builder().index(0).vaultId("0A3C98B7FEE1D56CB991E3E18D6D6170").returnType("TOKEN").build());
        vaultSearchRequests.add(VaultSearchRequest.builder().index(1).vaultId("C77F3BACA901976D3A99A1818E26C287").returnType("TOKEN").build());
        RequestBuilder requestBuilder = getVaultEntriesSearchRequestBuilder(vaultSearchRequests);
        doNothing().when(vaultDataScopeFilter).lookUpVaultSearchFilter(anyList(), any(HttpServletRequest.class));
        when(vaultService.searchVaultEntriesByVaultId(anyList(), anyMap())).thenReturn(getVaultEntriesSearchResponseWithBluefinTokenInfo());
        String expectedResponse = "[{\"responseData\": \"4485867467951655\",\"token\":\"4485861361361655\",\"tokenId\": \"DUMMY_TOKEN_ID_1\",\"index\": 0}"
                +",{\"responseData\": \"6018596782192368\",\"token\":\"6018592939132368\",\"tokenId\": \"DUMMY_TOKEN_ID_2\",\"index\": 1}]";

        MvcResult result = mockMvc.perform(requestBuilder).andReturn();
        MockHttpServletResponse response = result.getResponse();

        assertEquals(HttpStatus.OK.value(), response.getStatus());
        JSONAssert.assertEquals(expectedResponse, response.getContentAsString(), false);
    }

    @Test
    void shouldThrowErrorVaultEntriesSearchWhenSearchVaultEntriesByVaultIdThrowsError() throws Exception {
        List<VaultSearchRequest> vaultSearchRequests = new ArrayList<>();
        vaultSearchRequests.add(VaultSearchRequest.builder().index(0).vaultId("0A3C98B7FEE1D56CB991E3E18D6D6170").returnType("TOKEN").build());
        vaultSearchRequests.add(VaultSearchRequest.builder().index(1).vaultId("C77F3BACA901976D3A99A1818E26C287").returnType("TOKEN").build());
        RequestBuilder requestBuilder = getVaultEntriesSearchRequestBuilder(vaultSearchRequests);
        doNothing().when(vaultDataScopeFilter).lookUpVaultSearchFilter(anyList(), any(HttpServletRequest.class));

        when(vaultService.searchVaultEntriesByVaultId(anyList(), anyMap())).thenThrow(getVaultEntriesSearchError());
        MvcResult result = mockMvc.perform(requestBuilder).andReturn();
        MockHttpServletResponse response = result.getResponse();

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR.value(), response.getStatus());
    }

    @Test
    void shouldReturnInvalidRequestResponse() throws Exception {
        List<VaultSearchRequest> vaultSearchRequests = new ArrayList<>();
        vaultSearchRequests.add(VaultSearchRequest.builder().index(0).vaultId("4111110024511111").returnType("GIFT_CARD_NUMBER").build());
        vaultSearchRequests.add(VaultSearchRequest.builder().index(1).vaultId("12").returnType("CREDIT_CARD_EXPIRY_MONTH").build());
        RequestBuilder requestBuilder = getVaultEntriesSearchRequestBuilder(vaultSearchRequests);
        doThrow(new ValidationException(ErrorEntityCodes.INVALID_REQUEST))
                .when(vaultDataScopeFilter).lookUpVaultSearchFilter(anyList(), any(HttpServletRequest.class));
        when(vaultService.searchVaultEntriesByVaultId(anyList(), anyMap())).thenReturn(getVaultEntriesSearchResponse());
        String expectedResponse = "{\"userMessage\":\"Invalid  request\", \"errorCode\": 3}";

        MvcResult result = mockMvc.perform(requestBuilder).andReturn();
        MockHttpServletResponse response = result.getResponse();

        assertEquals(HttpStatus.BAD_REQUEST.value(), response.getStatus());
        JSONAssert.assertEquals(expectedResponse, response.getContentAsString(), false);
    }

    private MockHttpServletRequestBuilder getVaultEntriesRequestBuilder(List<VaultRequest> vaultEntriesRequest) {
        return MockMvcRequestBuilders.post(VAULT_ENTRIES_PATH)
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.APPLICATION_JSON)
                .content(asJsonString(vaultEntriesRequest));
    }

    private RequestBuilder getVaultEntriesSearchRequestBuilder(List<VaultSearchRequest> vaultSearchRequests) {
        return MockMvcRequestBuilders.post(VAULT_ENTRIES_SEARCH_PATH)
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.APPLICATION_JSON)
                .content(asJsonString(vaultSearchRequests));
    }

    private ResponseEntity<List<VaultResponse>> getVaultEntriesResponse() {
        List<VaultResponse> vaultResponses = new ArrayList<>();
        vaultResponses.add(VaultResponse.builder().vaultId("26DD0155DFBB037CCAE71ADBCA67A689").index(0).build());
        vaultResponses.add(VaultResponse.builder().vaultId("19F741B2F8308AAE8631B7DD5F116B55").index(1).build());
        return new ResponseEntity<>(vaultResponses, HttpStatus.OK);
    }

    private ResponseEntity<List<SearchResponse>> getVaultEntriesSearchResponse() {
        List<SearchResponse> searchResponses = new ArrayList<>();
        searchResponses.add(SearchResponse.builder().index(0).responseData("4111110024511111").build());
        searchResponses.add(SearchResponse.builder().index(1).responseData("4111118681411112").build());
        return new ResponseEntity<>(searchResponses, HttpStatus.OK);
    }

    private ResponseEntity<List<SearchResponse>> getVaultEntriesSearchResponseWithBluefinTokenInfo() {
        List<SearchResponse> searchResponses = new ArrayList<>();
        searchResponses.add(SearchResponse.builder()
                .index(0)
                .responseData("4485867467951655")
                .token("4485861361361655")
                .tokenId("DUMMY_TOKEN_ID_1")
                .build());

        searchResponses.add(SearchResponse.builder()
                .index(1)
                .responseData("6018596782192368")
                .token("6018592939132368")
                .tokenId("DUMMY_TOKEN_ID_2")
                .build());
        return new ResponseEntity<>(searchResponses, HttpStatus.OK);
    }

    private VaultServiceException getVaultEntriesSearchError() {
        return new VaultServiceException("Unable to get token info for given vault ids");
    }

    /**
     * Converts request to Json String
     *
     * @param obj Input request object
     * @return String of Json
     */
    private static String asJsonString(final Object obj) {
        try {
            return new ObjectMapper().writeValueAsString(obj);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}
