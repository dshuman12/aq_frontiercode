package com.gap.customer.vaultservice.services.Impl;

import com.gap.customer.vaultservice.Validators.SearchValidators;
import com.gap.customer.vaultservice.Validators.VaultEntryServiceValidator;
import com.gap.customer.vaultservice.controller.TraceHeaders;
import com.gap.customer.vaultservice.exception.VaultServiceException;
import com.gap.customer.vaultservice.models.SearchResponse;
import com.gap.customer.vaultservice.models.VaultClientRequest;
import com.gap.customer.vaultservice.models.VaultClientResponse;
import com.gap.customer.vaultservice.models.VaultClientResult;
import com.gap.customer.vaultservice.models.VaultFeatureToggle;
import com.gap.customer.vaultservice.models.VaultRequest;
import com.gap.customer.vaultservice.models.VaultResponse;
import com.gap.customer.vaultservice.models.VaultSearchRequest;
import com.gap.customer.vaultservice.services.VaultClientRequestBuilder;
import com.gap.customer.vaultservice.services.VaultClientResponseBuilder;
import com.gap.customer.vaultservice.services.VaultClientService;
import com.gap.customer.vaultservice.util.VaultConstants;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.junit.jupiter.SpringExtension;

import javax.servlet.http.HttpServletRequest;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;

@ExtendWith(SpringExtension.class)
public class VaultServiceImplTest {

    @Mock
    private VaultClientRequestBuilder vaultClientRequestBuilder;

    @Mock
    private VaultClientResponseBuilder vaultClientResponseBuilder;

    @Mock
    private SearchValidators searchValidators;

    @Mock
    private VaultClientService vaultClientService;

    @Mock
    private VaultClientRequest vaultClientRequest;

    @Mock
    private VaultClientResponse vaultClientResponse;

    @Mock
    private HttpServletRequest httpServletRequest;

    @Mock
    private ClientMediator clientMediator;

    @Mock
    private VaultFeatureToggle vaultFeatureToggle;


    @Mock
    private VaultEntryServiceValidator vaultEntryServiceValidator;

    @InjectMocks
    private VaultServiceImpl vaultService;


    @BeforeEach
    public void setup() {
        vaultService = new VaultServiceImpl(vaultClientRequestBuilder, vaultClientResponseBuilder, searchValidators,
                vaultClientService, clientMediator, vaultFeatureToggle, vaultEntryServiceValidator);
    }

    @Test
    public void testValidCreateVaultEntriesIsCreatedWhenItIsLegacyCall() throws Exception {

        vaultEntryServiceValidator.hasValidVaultPostRequestsForLegacy(createVaultRequestForVaultEntries(), "VaultTests");

        when(vaultClientRequestBuilder.buildVaultClientRequestsForVaultEntries(createVaultRequestForVaultEntries()))
                .thenReturn(createVaultClientRequest());


        when(vaultClientResponseBuilder.buildVaultResponses(anyList(), any()))
                .thenReturn(createVaultResponseForVaultEntries());

        createVaultResponseForVaultEntries().sort(Comparator.comparing(VaultResponse::getIndex));

        vaultService.createVaultEntries(createVaultRequestForVaultEntries(), getHeadersFromRequest(httpServletRequest), true);
    }

    @Test
    public void testValidCreateVaultEntriesIsCreatedWhenItIsNotLegacyCall() throws Exception {

        vaultEntryServiceValidator.hasValidVaultPostRequests(createVaultRequestForVaultEntries(), "VaultTests");

        when(vaultClientRequestBuilder.buildVaultClientRequestsForVaultEntries(createVaultRequestForVaultEntries()))
                .thenReturn(createVaultClientRequest());


        when(vaultClientResponseBuilder.buildVaultResponses(anyList(), any()))
                .thenReturn(createVaultResponseForVaultEntries());

        createVaultResponseForVaultEntries().sort(Comparator.comparing(VaultResponse::getIndex));

        vaultService.createVaultEntries(createVaultRequestForVaultEntries(), getHeadersFromRequest(httpServletRequest), false);
    }

    //@Test
    public void testValidVaultEntriesSearchIsCreatedAndReturned() throws Exception {

        searchValidators.validateVaultSearch(createVaultSearchRequestForVaultEntries());

        when(vaultClientResponseBuilder.buildResponsesForVaultSearch(anyList(), any()))
                .thenReturn(getVaultEntriesSearchResponses());

        getVaultEntriesSearchResponses().sort(Comparator.comparing(SearchResponse::getIndex));

        vaultService.searchVaultEntriesByVaultId(createVaultSearchRequestForVaultEntries(), getHeadersFromRequest(httpServletRequest));
    }


    @Test
    public void shouldReturnTokenInfoInSearchResponsesForSearchVaultEntriesByVaultIdWhenVaultClientRequestIsValid() throws Exception {
        doNothing().when(searchValidators).validateVaultSearch(getVaultSearchRequests());
        when(vaultClientRequestBuilder.buildVaultClientRequestForVaultSearch(anyList())).thenReturn(getVaultClientRequestForvaultEntriesSearch());
        when(vaultClientResponseBuilder.buildResponsesForVaultSearch(anyList(), any()))
                .thenReturn(getVaultEntriesSearchResponseWithBluefinTokenInfo());
        when(vaultFeatureToggle.isLegacyCloud()).thenReturn(false);
        when(clientMediator.mapperForVaultEntriesSearch(any(VaultClientRequest.class), any()))
                .thenReturn(getVaultClientResponseForVaultEntriesSearchWithBluefinInfo());

        ResponseEntity<List<SearchResponse>> actualResult = vaultService.searchVaultEntriesByVaultId(getVaultSearchRequests(), getHeadersFromRequest(httpServletRequest));

        assertEquals(getVaultEntriesSearchResponseWithBluefinTokenInfo().size(), actualResult.getBody().size());
    }

    @Test
    public void shouldThrowErrorForSearchVaultEntriesByVaultIdWhenMapperForVaultEntriesSearchThrowsAnError() throws Exception {
        VaultServiceException vaultServiceException = getVaultEntriesSearchError();
        doNothing().when(searchValidators).validateVaultSearch(getVaultSearchRequests());
        when(vaultClientRequestBuilder.buildVaultClientRequestForVaultSearch(anyList())).thenReturn(getVaultClientRequestForvaultEntriesSearch());
        when(vaultClientResponseBuilder.buildResponsesForVaultSearch(anyList(), any()))
                .thenReturn(getVaultEntriesSearchResponseWithBluefinTokenInfo());
        when(vaultFeatureToggle.isLegacyCloud()).thenReturn(false);
        when(clientMediator.mapperForVaultEntriesSearch(any(VaultClientRequest.class), any()))
                .thenThrow(vaultServiceException);

        VaultServiceException actualResult = assertThrows(VaultServiceException.class, () ->
                vaultService.searchVaultEntriesByVaultId(getVaultSearchRequests(), getHeadersFromRequest(httpServletRequest)));

        assertEquals(vaultServiceException.getMessage(), actualResult.getMessage());
    }

    private List<VaultSearchRequest> createVaultSearchRequestForVaultEntries() {
        List<VaultSearchRequest> vaultSearchRequests = new ArrayList<>();
        VaultSearchRequest vaultSearchRequest2 = VaultSearchRequest.builder()
                .vaultId("28009BDA56895DC28A44933D00A4F808")
                .returnType("CREDIT_CARD_EXPIRY_MONTH")
                .index(1)
                .build();

        VaultSearchRequest vaultSearchRequest3 = VaultSearchRequest.builder()
                .vaultId("48A9BDA10B63FC4D76D5C9DE38FC2926")
                .returnType("GIFT_CARD_PIN")
                .index(2)
                .build();

        vaultSearchRequests.add(vaultSearchRequest2);
        vaultSearchRequests.add(vaultSearchRequest3);

        return vaultSearchRequests;
    }

    private List<VaultSearchRequest> getVaultSearchRequests() {
        List<VaultSearchRequest> vaultRequests = new ArrayList<>();
        VaultSearchRequest vaultRequest1 = VaultSearchRequest.builder()
                .returnType(VaultConstants.DATA_TYPE_TOKEN)
                .index(0)
                .vaultId("0A3C98B7FEE1D56CB991E3E18D6D6170")
                .build();

        VaultSearchRequest vaultRequest2 = VaultSearchRequest.builder()
                .returnType(VaultConstants.DATA_TYPE_TOKEN)
                .index(1)
                .vaultId("C77F3BACA901976D3A99A1818E26C287")
                .build();

        vaultRequests.add(vaultRequest1);
        vaultRequests.add(vaultRequest2);

        return vaultRequests;
    }

    private List<SearchResponse> getVaultEntriesSearchResponseWithBluefinTokenInfo() {
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
        return searchResponses;
    }


    private List<SearchResponse> getVaultEntriesSearchResponses() {
        List<SearchResponse> searchResponses = new ArrayList<>();

        SearchResponse searchResponse1 = SearchResponse.builder()
                .responseData("2019")
                .index(0)
                .build();
        SearchResponse searchResponse2 = SearchResponse.builder()
                .responseData("12")
                .index(1)
                .build();
        SearchResponse searchResponse3 = SearchResponse.builder()
                .responseData("10")
                .index(2)
                .build();

        searchResponses.add(searchResponse1);
        searchResponses.add(searchResponse2);
        searchResponses.add(searchResponse3);


        return searchResponses;
    }

    private List<VaultResponse> createVaultResponseForVaultEntries() {
        List<VaultResponse> vaultResponses = new ArrayList<>();

        VaultResponse vaultResponse1 = VaultResponse.builder()
                .vaultId("BC89A9092A08A2E04BC9A9427114F097")
                .index(0)
                .build();

        VaultResponse vaultResponse2 = VaultResponse.builder()
                .vaultId("90F7BA1B7672BB881DD11CB70E100489")
                .index(0)
                .build();
        vaultResponses.add(vaultResponse1);
        vaultResponses.add(vaultResponse2);

        return vaultResponses;
    }

    private VaultClientResponse getVaultClientResponseForVaultEntriesSearchWithBluefinInfo() {
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

    private VaultClientResponse getVaultResponsesForVaultEntries() {
        ArrayList<VaultClientResult> vaultClientResults = new ArrayList<>();

        VaultClientResult vaultClientResult1 = VaultClientResult.builder()
                .requestData("4479951709255127")
                .responseData("4479953958875127")
                .build();

        VaultClientResult vaultClientResult2 = VaultClientResult.builder()
                .requestData("4479951709255128")
                .responseData("4489951583665128")
                .build();

        vaultClientResults.add(vaultClientResult1);
        vaultClientResults.add(vaultClientResult2);

        vaultClientResponse = VaultClientResponse.builder()
                .responseFormat(VaultConstants.DATA_TYPE_TOKEN)
                .requestFormat("CreditCardNumber")
                .result(vaultClientResults)
                .build();

        return vaultClientResponse;
    }

    private List<VaultRequest> createVaultRequestForVaultEntries() {
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

    private VaultClientRequest createVaultClientRequest() {
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

        vaultClientRequest = VaultClientRequest.builder()
                .requestData(setPlainTextDataList(vaultRequests))
                .requestFormat("VAULT_ID")
                .responseFormat(VaultConstants.DATA_TYPE_VAULT_ID)
                .build();

        return vaultClientRequest;
    }

    private VaultClientRequest getVaultClientRequestForvaultEntriesSearch() {
        List<VaultSearchRequest> vaultRequests = getVaultSearchRequests();

        VaultClientRequest vaultClientRequest = VaultClientRequest.builder()
                .responseFormat(VaultConstants.DATA_TYPE_TOKEN)
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

    private String[] setPlainTextDataList(List<VaultRequest> vaultRequests) {
        return vaultRequests.stream()
                .map(VaultRequest::getPlaintext)
                .toArray(String[]::new);
    }

    private VaultServiceException getVaultEntriesSearchError() {
        return new VaultServiceException("Unable to get token info for given vault ids");
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