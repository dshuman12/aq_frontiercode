package com.gap.gid.tests.service;


import com.gap.customer.vaultservice.VaultServiceApplication;
import com.gap.customer.vaultservice.models.VaultFeatureToggle;
import com.gap.customer.vaultservice.models.VaultRequest;
import com.gap.customer.vaultservice.models.VaultResponse;
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

import java.net.URI;
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
public class TokenServiceImplTest extends VaultServiceBaseTest {


    private static final String  TOKEN_ENTRY_SERVICE_URL = "http://localhost:9000/token-entries/";


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
    public void testTokenEntryWithoutLegacy() {
        vaultFeatureToggle.setLegacyEnabled(false);
        vaultRequests = getRequest();
        HttpEntity<List> requestEntity = new HttpEntity<List>(vaultRequests, setRequestHeaders());
        ResponseEntity<List<LinkedHashMap>> actualResponse = restTemplate.exchange(TOKEN_ENTRY_SERVICE_URL, HttpMethod.POST,
                requestEntity, new ParameterizedTypeReference<List<LinkedHashMap>>() {
                });

        assertEquals(actualResponse.getStatusCode(), HttpStatus.OK);
    }


    @Test
    public void testTokenEntryWithLegacy() {
        vaultFeatureToggle.setLegacyEnabled(true);
        vaultRequests = getRequest();
        HttpEntity<List> requestEntity = new HttpEntity<List>(vaultRequests, setRequestHeaders());
        ResponseEntity<List<LinkedHashMap>> actualResponse = restTemplate.exchange(TOKEN_ENTRY_SERVICE_URL, HttpMethod.POST,
                requestEntity, new ParameterizedTypeReference<List<LinkedHashMap>>() {
                });

        assertEquals(actualResponse.getStatusCode(), HttpStatus.OK);
    }



    private List<VaultRequest> getRequest() {
        List<VaultRequest> vaultRequests = new ArrayList<VaultRequest>();
        vaultRequests.add(new VaultRequest(VaultTestConstants.CREDIT_CARD_NUMBER, getSecuredInputData(), 0));
        return vaultRequests;
    }


    private HttpHeaders setRequestHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setAccept(Collections.singletonList(MediaType.APPLICATION_JSON));
        return headers;
    }
}
