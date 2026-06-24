package com.gap.customer.vaultservice.controller;

import com.gap.customer.vaultservice.VaultServiceApplication;
import com.gap.customer.vaultservice.models.VaultRequest;
import com.gap.customer.vaultservice.models.VaultResponse;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
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
public class VaultRestClientImplTest {

    private static final String VAULT_SECURED_SERVICE_URL = "http://localhost:9000/vault-entries/";
    private TestRestTemplate restTemplate;
    private List<VaultRequest> vaultRequests;

    @Before
    public void setUp() {
        restTemplate = new TestRestTemplate();
        vaultRequests = new ArrayList<VaultRequest>();
        List<VaultResponse> vaultResponses = new ArrayList<VaultResponse>();
    }

    //@Test
    public void testBuildResponseWithPreview() {
        vaultRequests = getRequest();
        HttpEntity<List> requestEntity = new HttpEntity<List>(vaultRequests, setRequestHeadersWithPreview());
        ResponseEntity<List<LinkedHashMap>> actualResponse = restTemplate.exchange(VAULT_SECURED_SERVICE_URL, HttpMethod.POST,
                requestEntity, new ParameterizedTypeReference<List<LinkedHashMap>>() {
                });
        assertEquals(actualResponse.getStatusCode(), HttpStatus.OK);
        assertEquals(actualResponse.getBody().size(), 1);
        assertEquals(actualResponse.getBody().get(0).get("vaultId"), "BA8BF0A4E64B3471AB23D8530CE3176A");
        assertEquals(actualResponse.getBody().get(0).get("index").toString(), "0");
    }


    @Test
    public void testBuildResponseWithoutPreview() {
        vaultRequests = getRequest();
        HttpEntity<List> requestEntity = new HttpEntity<List>(vaultRequests, setRequestHeadersWithoutPreview());
        ResponseEntity<List<LinkedHashMap>> actualResponse = restTemplate.exchange(VAULT_SECURED_SERVICE_URL, HttpMethod.POST,
                requestEntity, new ParameterizedTypeReference<List<LinkedHashMap>>() {
                });

        assertEquals(actualResponse.getStatusCode(), HttpStatus.OK);
        assertEquals(actualResponse.getBody().size(), 1);
        assertEquals(actualResponse.getBody().get(0).get("vaultId"), "51940520004144A2FA626C91168307A8");
        assertEquals(actualResponse.getBody().get(0).get("index").toString(), "0");
    }

    private List<VaultRequest> getRequest() {
        List<VaultRequest> vaultRequests = new ArrayList<VaultRequest>();
        vaultRequests.add(new VaultRequest("CREDIT_CARD_NUMBER", "4558645888603826", 0));
        return vaultRequests;
    }

    private HttpHeaders setRequestHeadersWithPreview() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setAccept(Collections.singletonList(MediaType.APPLICATION_JSON));
        headers.set("isPreviewRequest", "true");
        return headers;
    }

    private HttpHeaders setRequestHeadersWithoutPreview() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setAccept(Collections.singletonList(MediaType.APPLICATION_JSON));
        return headers;
    }
}
