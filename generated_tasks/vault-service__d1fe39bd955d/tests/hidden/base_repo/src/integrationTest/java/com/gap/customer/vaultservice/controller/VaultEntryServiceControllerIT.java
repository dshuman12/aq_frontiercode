package com.gap.customer.vaultservice.controller;


import com.gap.customer.vaultservice.VaultServiceApplication;
import com.gap.customer.vaultservice.error.ErrorEntity;
import com.gap.customer.vaultservice.models.VaultRequest;
import com.gap.customer.vaultservice.models.VaultResponse;
import org.junit.Before;
import org.junit.Ignore;
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

@Ignore
@RunWith(SpringJUnit4ClassRunner.class)
@ComponentScan
@SpringBootTest(properties = {"server.port=9000"},
        classes = {VaultServiceApplication.class},
        webEnvironment = SpringBootTest.WebEnvironment.DEFINED_PORT)
public class VaultEntryServiceControllerIT {

    private static final String VAULT_SECURED_SERVICE_URL = "http://localhost:9000/vault-entries/search";

    private TestRestTemplate restTemplate;
    private List<VaultRequest> vaultRequests;


    @Before
    public void setUp() {
        restTemplate = new TestRestTemplate();
        vaultRequests = new ArrayList<VaultRequest>();
        List<VaultResponse> vaultResponses = new ArrayList<VaultResponse>();
    }


    @Test
    public void testGetVaultIdsSuccessIT() {

        vaultRequests = getRequest();
        HttpEntity<List> requestEntity = new HttpEntity<List>(vaultRequests, setRequestHeaders());
        ResponseEntity<List<LinkedHashMap>> actualResponse = restTemplate.exchange(VAULT_SECURED_SERVICE_URL, HttpMethod.POST,
                requestEntity, new ParameterizedTypeReference<List<LinkedHashMap>>() {
                });

        assertEquals(actualResponse.getStatusCode(), HttpStatus.OK);
        assertEquals(actualResponse.getBody().size(), 1);
        assertEquals(actualResponse.getBody().get(0).get("vaultId"), "51940520004144A2FA626C91168307A8");
        assertEquals(actualResponse.getBody().get(0).get("index").toString(), "0");

    }


    @Test
    public void testEmptyRequestListIT() {

        HttpEntity<List> requestEntity = new HttpEntity<List>(vaultRequests, setRequestHeaders());
        ResponseEntity<ErrorEntity> actualResponse = restTemplate.exchange(VAULT_SECURED_SERVICE_URL, HttpMethod.POST,
                requestEntity, ErrorEntity.class);

        assertEquals(actualResponse.getStatusCode(), HttpStatus.BAD_REQUEST);
        assertEquals(actualResponse.getBody().getUserMessage(), "Index, type or plaintext is missing.");
        assertEquals(actualResponse.getBody().getErrorCode().toString(), "3");
    }


    @Test
    public void testMissingPlainTextIT() {

        vaultRequests.add(new VaultRequest("CREDIT_CARD_NUMBER", "", 0));
        vaultRequests.add(new VaultRequest("CREDIT_CARD_EXPIRY_YEAR", "", 1));
        vaultRequests.add(new VaultRequest("CREDIT_CARD_EXPIRY_MONTH", "", 2));

        HttpEntity<List> requestEntity = new HttpEntity<List>(vaultRequests, setRequestHeaders());
        ResponseEntity<ErrorEntity> actualResponse = restTemplate.exchange(VAULT_SECURED_SERVICE_URL, HttpMethod.POST,
                requestEntity, ErrorEntity.class);

        assertEquals(actualResponse.getStatusCode(), HttpStatus.BAD_REQUEST);
        assertEquals(actualResponse.getBody().getUserMessage(), "Index, type or plaintext is missing.");
        assertEquals(actualResponse.getBody().getErrorCode().toString(), "3");
    }


    @Test
    public void tesMissingTypeIT() {

        vaultRequests.add(new VaultRequest("", "4111111111111111", 0));
        vaultRequests.add(new VaultRequest("", "5555555555554440", 1));

        HttpEntity<List> requestEntity = new HttpEntity<List>(vaultRequests, setRequestHeaders());
        ResponseEntity<ErrorEntity> actualResponse = restTemplate.exchange(VAULT_SECURED_SERVICE_URL, HttpMethod.POST,
                requestEntity, ErrorEntity.class);

        assertEquals(actualResponse.getStatusCode(), HttpStatus.BAD_REQUEST);
        assertEquals(actualResponse.getBody().getUserMessage(), "Index, type or plaintext is missing.");
        assertEquals(actualResponse.getBody().getErrorCode().toString(), "3");
    }


    @Test
    public void testInvalidTypeVauleIT() {

        vaultRequests.add(new VaultRequest("CREDIT_CARD_EXPIRY_YEARSS", "2018", 1));
        vaultRequests.add(new VaultRequest("CREDIT_CARD_EXPIRY_MON", "12", 2));
        vaultRequests.add(new VaultRequest("GIFT_CARD_NUMBER", "4558645888603826", 3));
        vaultRequests.add(new VaultRequest("GIFT_CARD_PINS", "1887", 4));


        HttpEntity<List> requestEntity = new HttpEntity<List>(vaultRequests, setRequestHeaders());
        ResponseEntity<ErrorEntity> actualResponse = restTemplate.exchange(VAULT_SECURED_SERVICE_URL, HttpMethod.POST,
                requestEntity, ErrorEntity.class);

        assertEquals(actualResponse.getStatusCode(), HttpStatus.BAD_REQUEST);
        assertEquals(actualResponse.getBody().getUserMessage(), "Some types are invalid.");
        assertEquals(actualResponse.getBody().getErrorCode().toString(), "2");
    }


    @Test
    public void testPlainTextIsNumericIT() {


        vaultRequests.add(new VaultRequest("CREDIT_CARD_NUMBER", "abcdefghijklmnop", 0));
        vaultRequests.add(new VaultRequest("CREDIT_CARD_EXPIRY_YEAR", "twentyeighteen", 1));
        vaultRequests.add(new VaultRequest("CREDIT_CARD_EXPIRY_MONTH", "aug", 2));
        vaultRequests.add(new VaultRequest("GIFT_CARD_NUMBER", "abcdefghijklmnop", 3));

        HttpEntity<List> requestEntity = new HttpEntity<List>(vaultRequests, setRequestHeaders());
        ResponseEntity<ErrorEntity> actualResponse = restTemplate.exchange(VAULT_SECURED_SERVICE_URL, HttpMethod.POST,
                requestEntity, ErrorEntity.class);

        assertEquals(actualResponse.getStatusCode(), HttpStatus.BAD_REQUEST);
        assertEquals(actualResponse.getBody().getUserMessage(), "Some credit card numbers are invalid.");
        assertEquals(actualResponse.getBody().getErrorCode().toString(), "5");
    }


    @Test
    public void testPlainTextMinLengthIT() {

        vaultRequests.add(new VaultRequest("CREDIT_CARD_NUMBER", "411111111111", 0));
        vaultRequests.add(new VaultRequest("CREDIT_CARD_NUMBER", "5555555555554440", 1));

        HttpEntity<List> requestEntity = new HttpEntity<List>(vaultRequests, setRequestHeaders());
        ResponseEntity<ErrorEntity> actualResponse = restTemplate.exchange(VAULT_SECURED_SERVICE_URL, HttpMethod.POST,
                requestEntity, ErrorEntity.class);

        assertEquals(actualResponse.getStatusCode(), HttpStatus.BAD_REQUEST);
        assertEquals(actualResponse.getBody().getUserMessage(), "Invalid credit card length - maximum allowed length is 30 and minimum allowed length is 13.");
        assertEquals(actualResponse.getBody().getErrorCode().toString(), "11");
    }


    @Test
    public void testPlainTextMaxLengthIT() {

        vaultRequests.add(new VaultRequest("CREDIT_CARD_NUMBER", "455864588860382689009", 0));
        vaultRequests.add(new VaultRequest("CREDIT_CARD_EXPIRY_YEAR", "2018", 1));
        vaultRequests.add(new VaultRequest("CREDIT_CARD_EXPIRY_MONTH", "12", 2));
        vaultRequests.add(new VaultRequest("GIFT_CARD_NUMBER", "455864588860382689009", 3));

        HttpEntity<List> requestEntity = new HttpEntity<List>(vaultRequests, setRequestHeaders());
        ResponseEntity<ErrorEntity> actualResponse = restTemplate.exchange(VAULT_SECURED_SERVICE_URL, HttpMethod.POST,
                requestEntity, ErrorEntity.class);

        assertEquals(actualResponse.getStatusCode(), HttpStatus.BAD_REQUEST);
        assertEquals(actualResponse.getBody().getUserMessage(), "Invalid credit card length - maximum allowed length is 30 and minimum allowed length is 13.");
        assertEquals(actualResponse.getBody().getErrorCode().toString(), "11");
    }


    @Test
    public void testIndexesNotUniqueIT() {

        vaultRequests.add(new VaultRequest("CREDIT_CARD_NUMBER", "4558645888603826", 0));
        vaultRequests.add(new VaultRequest("CREDIT_CARD_EXPIRY_YEAR", "2018", 0));
        vaultRequests.add(new VaultRequest("CREDIT_CARD_EXPIRY_MONTH", "12", 0));
        vaultRequests.add(new VaultRequest("GIFT_CARD_NUMBER", "4558645888603826", 0));
        vaultRequests.add(new VaultRequest("GIFT_CARD_PIN", "1887", 0));

        HttpEntity<List> requestEntity = new HttpEntity<List>(vaultRequests, setRequestHeaders());
        ResponseEntity<ErrorEntity> actualResponse = restTemplate.exchange(VAULT_SECURED_SERVICE_URL, HttpMethod.POST,
                requestEntity, ErrorEntity.class);

        assertEquals(actualResponse.getStatusCode(), HttpStatus.BAD_REQUEST);
        assertEquals(actualResponse.getBody().getUserMessage(), "Indexes are not unique.");
        assertEquals(actualResponse.getBody().getErrorCode().toString(), "1");
    }


    @Test
    public void testInvalidCreditCardExpiryYear() {

        vaultRequests.add(new VaultRequest("CREDIT_CARD_NUMBER", "4111111111111111", 0));
        vaultRequests.add(new VaultRequest("CREDIT_CARD_EXPIRY_YEAR", "201893", 1));
        vaultRequests.add(new VaultRequest("CREDIT_CARD_EXPIRY_MONTH", "12", 2));

        HttpEntity<List> requestEntity = new HttpEntity<List>(vaultRequests, setRequestHeaders());
        ResponseEntity<ErrorEntity> actualResponse = restTemplate.exchange(VAULT_SECURED_SERVICE_URL, HttpMethod.POST,
                requestEntity, ErrorEntity.class);

        assertEquals(actualResponse.getStatusCode(), HttpStatus.BAD_REQUEST);
        assertEquals("Invalid credit card expiry year length - maximum allowed length is 4 and minimum allowed length is 2.", actualResponse.getBody().getUserMessage());
        assertEquals(actualResponse.getBody().getErrorCode().toString(), "5");
    }


    @Test
    public void testInvalidCreditCardExpiryMonth() {

        vaultRequests.add(new VaultRequest("CREDIT_CARD_NUMBER", "4111111111111111", 0));
        vaultRequests.add(new VaultRequest("CREDIT_CARD_EXPIRY_YEAR", "2022", 1));
        vaultRequests.add(new VaultRequest("CREDIT_CARD_EXPIRY_MONTH", "120", 2));


        HttpEntity<List> requestEntity = new HttpEntity<List>(vaultRequests, setRequestHeaders());
        ResponseEntity<ErrorEntity> actualResponse = restTemplate.exchange(VAULT_SECURED_SERVICE_URL, HttpMethod.POST,
                requestEntity, ErrorEntity.class);

        assertEquals(actualResponse.getStatusCode(), HttpStatus.BAD_REQUEST);
        assertEquals("Invalid credit card expiry month - maximum allowed length is 2 and minimum allowed length is 2.",actualResponse.getBody().getUserMessage());
        assertEquals(actualResponse.getBody().getErrorCode().toString(), "5");
    }

    @Test
    public void testGetVaultIdsSuccessForGiftCardNumberIT() {

        vaultRequests.add(new VaultRequest("GIFT_CARD_NUMBER", "5558645888603826", 0));
        HttpEntity<List> requestEntity = new HttpEntity<List>(vaultRequests, setRequestHeaders());
        ResponseEntity<List<LinkedHashMap>> actualResponse = restTemplate.exchange(VAULT_SECURED_SERVICE_URL, HttpMethod.POST,
                requestEntity, new ParameterizedTypeReference<List<LinkedHashMap>>() {
                });

        assertEquals(actualResponse.getStatusCode(), HttpStatus.OK);
        assertEquals(actualResponse.getBody().size(), 1);
        assertEquals(actualResponse.getBody().get(0).get("vaultId"), "26C24BB80E0B942BF9BDC450EFA5CE83");
        assertEquals(actualResponse.getBody().get(0).get("index").toString(), "0");

    }

    @Test
    public void testGiftCardNumbertMinLengthIT() {

        vaultRequests.add(new VaultRequest("GIFT_CARD_NUMBER", "555864588860382", 0));

        HttpEntity<List> requestEntity = new HttpEntity<List>(vaultRequests, setRequestHeaders());
        ResponseEntity<ErrorEntity> actualResponse = restTemplate.exchange(VAULT_SECURED_SERVICE_URL, HttpMethod.POST,
                requestEntity, ErrorEntity.class);

        assertEquals(actualResponse.getStatusCode(), HttpStatus.BAD_REQUEST);
        assertEquals(actualResponse.getBody().getUserMessage(), "Invalid gift card length - Maximum allowed length is 20 and Minimum allowed length is 16");
        assertEquals(actualResponse.getBody().getErrorCode().toString(), "6");
    }


    @Test
    public void testGiftcardNumberMaxLengthIT() {

        vaultRequests.add(new VaultRequest("GIFT_CARD_NUMBER", "555864588860382927846", 0));

        HttpEntity<List> requestEntity = new HttpEntity<List>(vaultRequests, setRequestHeaders());
        ResponseEntity<ErrorEntity> actualResponse = restTemplate.exchange(VAULT_SECURED_SERVICE_URL, HttpMethod.POST,
                requestEntity, ErrorEntity.class);

        assertEquals(actualResponse.getStatusCode(), HttpStatus.BAD_REQUEST);
        assertEquals(actualResponse.getBody().getUserMessage(), "Invalid gift card length - Maximum allowed length is 20 and Minimum allowed length is 16");
        assertEquals(actualResponse.getBody().getErrorCode().toString(), "6");
    }

    @Test
    public void testGetVaultIdsSuccessForGiftCardPinIT() {

        vaultRequests.add(new VaultRequest("GIFT_CARD_PIN", "5558", 0));
        HttpEntity<List> requestEntity = new HttpEntity<List>(vaultRequests, setRequestHeaders());
        ResponseEntity<List<LinkedHashMap>> actualResponse = restTemplate.exchange(VAULT_SECURED_SERVICE_URL, HttpMethod.POST,
                requestEntity, new ParameterizedTypeReference<List<LinkedHashMap>>() {
                });

        assertEquals(actualResponse.getStatusCode(), HttpStatus.OK);
        assertEquals(actualResponse.getBody().size(), 1);
        assertEquals(actualResponse.getBody().get(0).get("vaultId"), "8AD402C826816D16DF848B9FDF767428");
        assertEquals(actualResponse.getBody().get(0).get("index").toString(), "0");

    }

    @Test
    public void testGiftCardPinMinLengthIT() {

        vaultRequests.add(new VaultRequest("GIFT_CARD_PIN", "934", 0));

        HttpEntity<List> requestEntity = new HttpEntity<List>(vaultRequests, setRequestHeaders());
        ResponseEntity<ErrorEntity> actualResponse = restTemplate.exchange(VAULT_SECURED_SERVICE_URL, HttpMethod.POST,
                requestEntity, ErrorEntity.class);

        assertEquals(actualResponse.getStatusCode(), HttpStatus.BAD_REQUEST);
        assertEquals(actualResponse.getBody().getUserMessage(), "Invalid Gift Card Pin Length");
        assertEquals(actualResponse.getBody().getErrorCode().toString(), "10");
    }


    @Test
    public void testGiftcardPinMaxLengthIT() {

        vaultRequests.add(new VaultRequest("GIFT_CARD_PIN", "485864588860382927846", 0));

        HttpEntity<List> requestEntity = new HttpEntity<List>(vaultRequests, setRequestHeaders());
        ResponseEntity<ErrorEntity> actualResponse = restTemplate.exchange(VAULT_SECURED_SERVICE_URL, HttpMethod.POST,
                requestEntity, ErrorEntity.class);

        assertEquals(actualResponse.getStatusCode(), HttpStatus.BAD_REQUEST);
        assertEquals(actualResponse.getBody().getUserMessage(), "Invalid Gift Card Pin Length");
        assertEquals(actualResponse.getBody().getErrorCode().toString(), "10");
    }

    @Test
    public void testGetVaultIdsSuccessForGiftCardTrack2IT() {

        vaultRequests.add(new VaultRequest("GIFT_CARD_TRACK2", "43528974830212345", 0));
        HttpEntity<List> requestEntity = new HttpEntity<List>(vaultRequests, setRequestHeaders());
        ResponseEntity<List<LinkedHashMap>> actualResponse = restTemplate.exchange(VAULT_SECURED_SERVICE_URL, HttpMethod.POST,
                requestEntity, new ParameterizedTypeReference<List<LinkedHashMap>>() {
                });

        assertEquals(actualResponse.getStatusCode(), HttpStatus.OK);
        assertEquals(actualResponse.getBody().size(), 1);
        assertEquals(actualResponse.getBody().get(0).get("vaultId"), "82B921CFB3324A8A38340F2A6F92BA25");
        assertEquals(actualResponse.getBody().get(0).get("index").toString(), "0");

    }

    @Test
    public void testGiftCardTrack2tMinLengthIT() {

        vaultRequests.add(new VaultRequest("GIFT_CARD_TRACK2", "435289748302123", 0));

        HttpEntity<List> requestEntity = new HttpEntity<List>(vaultRequests, setRequestHeaders());
        ResponseEntity<ErrorEntity> actualResponse = restTemplate.exchange(VAULT_SECURED_SERVICE_URL, HttpMethod.POST,
                requestEntity, ErrorEntity.class);

        assertEquals(actualResponse.getStatusCode(), HttpStatus.BAD_REQUEST);
        assertEquals(actualResponse.getBody().getUserMessage(), "Invalid gift card track2 length - Maximum allowed length is 64 and Minimum allowed length is 16.");
        assertEquals(actualResponse.getBody().getErrorCode().toString(), "13");
    }


    @Test
    public void testGiftcardTrack2MaxLengthIT() {

        vaultRequests.add(new VaultRequest("GIFT_CARD_TRACK2", "43528974830212343528974830212343528974830212343528974830212372367", 0));

        HttpEntity<List> requestEntity = new HttpEntity<List>(vaultRequests, setRequestHeaders());
        ResponseEntity<ErrorEntity> actualResponse = restTemplate.exchange(VAULT_SECURED_SERVICE_URL, HttpMethod.POST,
                requestEntity, ErrorEntity.class);

        assertEquals(actualResponse.getStatusCode(), HttpStatus.BAD_REQUEST);
        assertEquals(actualResponse.getBody().getUserMessage(), "Invalid gift card track2 length - Maximum allowed length is 64 and Minimum allowed length is 16.");
        assertEquals(actualResponse.getBody().getErrorCode().toString(), "13");
    }


    private List<VaultRequest> getRequest() {
        List<VaultRequest> vaultRequests = new ArrayList<VaultRequest>();
        vaultRequests.add(new VaultRequest("CREDIT_CARD_NUMBER", "4558645888603826", 0));
        return vaultRequests;
    }


    private HttpHeaders setRequestHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setAccept(Collections.singletonList(MediaType.APPLICATION_JSON));
        return headers;
    }


}
