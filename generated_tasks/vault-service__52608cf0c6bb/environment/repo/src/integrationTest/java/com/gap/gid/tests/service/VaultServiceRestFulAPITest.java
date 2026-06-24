package com.gap.gid.tests.service;


import com.gap.customer.vaultservice.VaultServiceApplication;
import com.gap.customer.vaultservice.models.*;
import com.gap.gid.tests.VaultServiceBaseTest;
import com.gap.gid.tests.VaultTestConstants;
import lombok.extern.slf4j.Slf4j;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.*;
import org.springframework.test.context.junit4.SpringJUnit4ClassRunner;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;

import static org.junit.Assert.assertEquals;

@RunWith(SpringJUnit4ClassRunner.class)
@ComponentScan
@SpringBootTest(properties = {"server.port=9000"},
        classes = {VaultServiceApplication.class},
        webEnvironment = SpringBootTest.WebEnvironment.DEFINED_PORT)
@Slf4j
public class VaultServiceRestFulAPITest extends VaultServiceBaseTest {


    private static final String VAULT_ENTRY_SERVICE_URL = "http://localhost:9000/vault-entries/";
    private static final String VAULT_ENTRY_SEARCH_SERVICE_URL = "http://localhost:9000/vault-entries/search";
    private static final String TOKEN_ENTRY_SERVICE_URL = "http://localhost:9000/token-entries/";
    private static final String TOKEN_ENTRY_SEARCH_SERVICE_URL = "http://localhost:9000/token-entries/search";

    @Autowired
    private VaultFeatureToggle vaultFeatureToggle;
    private TestRestTemplate restTemplate;
    private List<VaultRequest> vaultRequests;


    @Before
    public void setUp() {
        restTemplate = new TestRestTemplate();
        vaultRequests = new ArrayList<VaultRequest>();
        List<VaultResponse> vaultResponses = new ArrayList<VaultResponse>();

    }



    @Test
    public void testVaultWithoutLegacy() {
        vaultFeatureToggle.setLegacyEnabled(false);
        String secureData =  getSecuredInputData();
        vaultRequests = getRequest(secureData);
        HttpEntity<List> requestEntity = new HttpEntity<List>(vaultRequests, setRequestHeaders());
        ResponseEntity<List<LinkedHashMap>> actualResponse = restTemplate.exchange(VAULT_ENTRY_SERVICE_URL, HttpMethod.POST,
                requestEntity, new ParameterizedTypeReference<List<LinkedHashMap>>() {
                });

        assertEquals(actualResponse.getStatusCode(), HttpStatus.OK);
        String vaultId =    actualResponse.getBody().get(0).get(VaultTestConstants.VAULTID).toString();
        List<VaultSearchRequest> vaultSearchRequestList = new ArrayList<>();
        VaultSearchRequest vaultSearchRequest =  VaultSearchRequest.builder().index(0).returnType(VaultTestConstants.GIFT_CARD_NUMBER).vaultId(vaultId).build();
        vaultSearchRequestList.add(vaultSearchRequest);
        HttpEntity<List> searchRequestEntity = new HttpEntity<List>(vaultSearchRequestList, setSearhRequestHeaders());
        ResponseEntity<List<LinkedHashMap>> searchResponse = restTemplate.exchange(VAULT_ENTRY_SEARCH_SERVICE_URL, HttpMethod.POST,
                searchRequestEntity, new ParameterizedTypeReference<List<LinkedHashMap>>() {
                });

        assertEquals(searchResponse.getStatusCode(), HttpStatus.OK);
        List<VaultRequest> vaultRequestListForToken = new ArrayList<>();
        VaultRequest vaultRequestForToken =  VaultRequest.builder().type(VaultTestConstants.CREDIT_CARD_NUMBER).index(0).plaintext(secureData).build();
        vaultRequestListForToken.add(vaultRequestForToken);
        HttpEntity<List> tokenRequestEntity = new HttpEntity<List>(vaultRequestListForToken, setRequestHeaders());
        ResponseEntity<List<LinkedHashMap>> tokenResponse = restTemplate.exchange(TOKEN_ENTRY_SERVICE_URL, HttpMethod.POST,
                tokenRequestEntity, new ParameterizedTypeReference<List<LinkedHashMap>>() {
                });

        assertEquals(tokenResponse.getStatusCode(), HttpStatus.OK);
        String searchToken = tokenResponse.getBody().get(0).get(VaultTestConstants.TOKEN_LEG).toString();
        List<TokenSearchRequest> tokenSearchRequestList =  new ArrayList<>();
        TokenSearchRequest tokenSearchRequest =  TokenSearchRequest.builder().returnType(VaultTestConstants.VAULT_ID).index(0).token(searchToken).build();
        tokenSearchRequestList.add(tokenSearchRequest);
        HttpEntity<List> tokenSearchRequestEntity = new HttpEntity<List>(tokenSearchRequestList, setRequestHeaders());
        ResponseEntity<List<LinkedHashMap>> tokenSearchResponse = restTemplate.exchange(TOKEN_ENTRY_SEARCH_SERVICE_URL, HttpMethod.POST,
                tokenSearchRequestEntity, new ParameterizedTypeReference<List<LinkedHashMap>>() {
                });

        assertEquals(tokenSearchResponse.getStatusCode(), HttpStatus.OK);
    }



    @Test
    public void testVaultWithLegacy() {
        vaultFeatureToggle.setLegacyEnabled(true);
        String secureData =  getSecuredInputData();
        vaultRequests = getRequest(secureData);
        HttpEntity<List> requestEntity = new HttpEntity<List>(vaultRequests, setRequestHeaders());
        ResponseEntity<List<LinkedHashMap>> actualResponse = restTemplate.exchange(VAULT_ENTRY_SERVICE_URL, HttpMethod.POST,
                requestEntity, new ParameterizedTypeReference<List<LinkedHashMap>>() {
                });

        assertEquals(actualResponse.getStatusCode(), HttpStatus.OK);
        String vaultId =    actualResponse.getBody().get(0).get(VaultTestConstants.VAULTID).toString();
        List<VaultSearchRequest> vaultSearchRequestList = new ArrayList<>();
        VaultSearchRequest vaultSearchRequest =  VaultSearchRequest.builder().index(0).returnType(VaultTestConstants.GIFT_CARD_NUMBER).vaultId(vaultId).build();
        vaultSearchRequestList.add(vaultSearchRequest);
        HttpEntity<List> searchRequestEntity = new HttpEntity<List>(vaultSearchRequestList, setSearhRequestHeaders());
        ResponseEntity<List<LinkedHashMap>> searchResponse = restTemplate.exchange(VAULT_ENTRY_SEARCH_SERVICE_URL, HttpMethod.POST,
                searchRequestEntity, new ParameterizedTypeReference<List<LinkedHashMap>>() {
                });

        assertEquals(searchResponse.getStatusCode(), HttpStatus.OK);
        List<VaultRequest> vaultRequestListForToken = new ArrayList<>();
        VaultRequest vaultRequestForToken =  VaultRequest.builder().type(VaultTestConstants.CREDIT_CARD_NUMBER).index(0).plaintext(secureData).build();
        vaultRequestListForToken.add(vaultRequestForToken);
        HttpEntity<List> tokenRequestEntity = new HttpEntity<List>(vaultRequestListForToken, setRequestHeaders());
        ResponseEntity<List<LinkedHashMap>> tokenResponse = restTemplate.exchange(TOKEN_ENTRY_SERVICE_URL, HttpMethod.POST,
                tokenRequestEntity, new ParameterizedTypeReference<List<LinkedHashMap>>() {
                });

        assertEquals(tokenResponse.getStatusCode(), HttpStatus.OK);
        String searchToken = tokenResponse.getBody().get(0).get(VaultTestConstants.TOKEN_LEG).toString();
        List<TokenSearchRequest> tokenSearchRequestList =  new ArrayList<>();
        TokenSearchRequest tokenSearchRequest =  TokenSearchRequest.builder().returnType(VaultTestConstants.VAULT_ID).index(0).token(searchToken).build();
        tokenSearchRequestList.add(tokenSearchRequest);
        HttpEntity<List> tokenSearchRequestEntity = new HttpEntity<List>(tokenSearchRequestList, setRequestHeaders());
        ResponseEntity<List<LinkedHashMap>> tokenSearchResponse = restTemplate.exchange(TOKEN_ENTRY_SEARCH_SERVICE_URL, HttpMethod.POST,
                tokenSearchRequestEntity, new ParameterizedTypeReference<List<LinkedHashMap>>() {
                });

        assertEquals(tokenSearchResponse.getStatusCode(), HttpStatus.OK);
    }



    private List<VaultRequest> getRequest(String secureData) {

        List<VaultRequest> vaultRequests = new ArrayList<VaultRequest>();
        vaultRequests.add(new VaultRequest(VaultTestConstants.GIFT_CARD_NUMBER, secureData, 0));
        return vaultRequests;
    }


    private HttpHeaders setRequestHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setAccept(Collections.singletonList(MediaType.APPLICATION_JSON));
        return headers;
    }

    private HttpHeaders setSearhRequestHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setAccept(Collections.singletonList(MediaType.APPLICATION_JSON));
        headers.set(VaultTestConstants.X_APIGEE_SCOPES, VaultTestConstants.SCOPE_VALUES);
        return headers;
    }



}
