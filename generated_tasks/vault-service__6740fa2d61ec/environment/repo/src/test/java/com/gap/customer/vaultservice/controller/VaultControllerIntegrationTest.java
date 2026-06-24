package com.gap.customer.vaultservice.controller;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.gap.customer.vaultservice.VaultServiceApplication;
import com.gap.customer.vaultservice.models.VaultRequest;
import com.gap.gid.security.model.TokenizeResponse;
import com.gap.gid.security.model.Values;
import com.voltage.v1.client.ProtectFormattedDataResponse;
import org.apache.commons.lang3.StringUtils;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockserver.client.MockServerClient;
import org.mockserver.integration.ClientAndServer;
import org.mockserver.model.MediaType;
import org.mockserver.model.RegexBody;
import org.skyscreamer.jsonassert.JSONAssert;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.web.server.LocalServerPort;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.springframework.ws.client.core.WebServiceTemplate;
import org.springframework.ws.client.core.support.WebServiceGatewaySupport;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static com.gap.customer.vaultservice.util.VaultConstants.DATA_TYPE_CREDIT_CARD_EXPIRY_MONTH;
import static com.gap.customer.vaultservice.util.VaultConstants.DATA_TYPE_CREDIT_CARD_EXPIRY_YEAR;
import static com.gap.customer.vaultservice.util.VaultConstants.DATA_TYPE_CREDIT_CARD_NUMBER;
import static com.gap.customer.vaultservice.util.VaultConstants.DATA_TYPE_GIFT_CARD_NUMBER;
import static com.gap.customer.vaultservice.util.VaultConstants.DATA_TYPE_GIFT_CARD_PIN;
import static com.gap.customer.vaultservice.util.VaultConstants.DATA_TYPE_GIFT_CARD_TRACK2;
import static com.gap.customer.vaultservice.util.VaultConstants.DATA_TYPE_PASSWORD;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.mockserver.model.HttpRequest.request;
import static org.mockserver.model.HttpResponse.response;

@SpringBootTest(
        classes = {VaultServiceApplication.class},
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ExtendWith(SpringExtension.class)
public class VaultControllerIntegrationTest {

    private static final int MOCK_SERVER_DEFINED_PORT = 9091;

    @Mock
    WebServiceTemplate webServiceTemplate;

    @Autowired
    private WebServiceGatewaySupport webServiceGatewaySupport;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private TestRestTemplate testRestTemplate;

    private static ClientAndServer mockServer;

    @LocalServerPort
    private int port;

    @BeforeAll
    static void beforeAll() {
        mockServer = ClientAndServer.startClientAndServer(MOCK_SERVER_DEFINED_PORT);
    }

    @AfterAll
    static void afterAll() {
        mockServer.stop();
    }

    @Test
    void shouldReturnVaultIdForExistingGiftCardNumber() {
        String expectedResponse = "[{\"vaultId\":\"335B2676EB62204E61B7389377C71937\", \"index\": 1}]";
        var vaultEntriesRequest = new ArrayList<VaultRequest>();
        vaultEntriesRequest.add(buildVaultRequest(DATA_TYPE_GIFT_CARD_NUMBER, "4111338681411112", 1));
        HttpEntity<List> requestEntity = new HttpEntity<>(vaultEntriesRequest, setRequestHeaders());

        ResponseEntity<String> actualResponse = testRestTemplate.exchange(getVaultEntriesUrl(), HttpMethod.POST,
                requestEntity, new ParameterizedTypeReference<>() {
                });

        assertEquals(HttpStatus.OK, actualResponse.getStatusCode());
        JSONAssert.assertEquals(expectedResponse, actualResponse.getBody(), false);
    }

    @Test
    void shouldReturnVaultIdForExistingCreditCardNumber() throws IOException {
        mockBluefinResponse("4111110253851111", "4111110024511111");
        setMockWebServiceTemplateForVoltage();
        when(webServiceTemplate.marshalSendAndReceive(anyString(), any(), any()))
                .thenReturn(getVoltageResponse("4111110343851111"));

        List<VaultRequest> vaultEntriesRequest = new ArrayList<>();
        vaultEntriesRequest.add(buildVaultRequest(DATA_TYPE_CREDIT_CARD_NUMBER, "4111110024511111", 0));
        HttpEntity<List> requestEntity = new HttpEntity<>(vaultEntriesRequest, setRequestHeaders());

        ResponseEntity<String> actualResponse = testRestTemplate.exchange(getVaultEntriesUrl(), HttpMethod.POST,
                requestEntity, new ParameterizedTypeReference<>() {
                });

        String expectedResponse = "[{\"vaultId\":\"557DBBECD777AF264D7AD1FB51E826CD\", \"index\": 0}]";
        assertEquals(HttpStatus.OK, actualResponse.getStatusCode());
        JSONAssert.assertEquals(expectedResponse, actualResponse.getBody(), false);
    }

    @Test
    void shouldReturnVaultIdForExistingGiftCardPin() {
        List<VaultRequest> vaultEntriesRequest = new ArrayList<>();
        vaultEntriesRequest.add(buildVaultRequest(DATA_TYPE_GIFT_CARD_PIN, "5678", 0));
        HttpEntity<List> requestEntity = new HttpEntity<>(vaultEntriesRequest, setRequestHeaders());

        ResponseEntity<String> actualResponse = testRestTemplate.exchange(getVaultEntriesUrl(), HttpMethod.POST,
                requestEntity, new ParameterizedTypeReference<>() {
                });

        String expectedResponse = "[{\"vaultId\":\"56AB2676EB62204E61B7389377C71774\", \"index\": 0}]";
        assertEquals(HttpStatus.OK, actualResponse.getStatusCode());
        JSONAssert.assertEquals(expectedResponse, actualResponse.getBody(), false);
    }

    @Test
    void shouldReturnVaultIdForExistingCreditCardExpiryYear() {
        List<VaultRequest> vaultEntriesRequest = new ArrayList<>();
        vaultEntriesRequest.add(buildVaultRequest(DATA_TYPE_CREDIT_CARD_EXPIRY_YEAR, "2023", 0));
        HttpEntity<List> requestEntity = new HttpEntity<>(vaultEntriesRequest, setRequestHeaders());

        ResponseEntity<String> actualResponse = testRestTemplate.exchange(getVaultEntriesUrl(), HttpMethod.POST,
                requestEntity, new ParameterizedTypeReference<>() {
                });

        String expectedResponse = "[{\"vaultId\":\"99082676EB62204E61B7389377C71774\", \"index\": 0}]";
        assertEquals(HttpStatus.OK, actualResponse.getStatusCode());
        JSONAssert.assertEquals(expectedResponse, actualResponse.getBody(), false);
    }

    @Test
    void shouldReturnVaultIdForExistingCreditCardExpiryMonth() {
        List<VaultRequest> vaultEntriesRequest = new ArrayList<>();
        vaultEntriesRequest.add(buildVaultRequest(DATA_TYPE_CREDIT_CARD_EXPIRY_MONTH, "09", 0));
        HttpEntity<List> requestEntity = new HttpEntity<>(vaultEntriesRequest, setRequestHeaders());

        ResponseEntity<String> actualResponse = testRestTemplate.exchange(getVaultEntriesUrl(), HttpMethod.POST,
                requestEntity, new ParameterizedTypeReference<>() {
                });

        String expectedResponse = "[{\"vaultId\":\"7685AC676EB62204E61B7389377C7177\", \"index\": 0}]";
        assertEquals(HttpStatus.OK, actualResponse.getStatusCode());
        JSONAssert.assertEquals(expectedResponse, actualResponse.getBody(), false);
    }

    @Test
    void shouldReturnVaultIdForExistingGiftCardTrack2() {
        List<VaultRequest> vaultEntriesRequest = new ArrayList<>();
        vaultEntriesRequest.add(buildVaultRequest(DATA_TYPE_GIFT_CARD_TRACK2, "4123456789011996", 0));
        HttpEntity<List> requestEntity = new HttpEntity<>(vaultEntriesRequest, setRequestHeaders());

        ResponseEntity<String> actualResponse = testRestTemplate.exchange(getVaultEntriesUrl(), HttpMethod.POST,
                requestEntity, new ParameterizedTypeReference<>() {
                });

        String expectedResponse = "[{\"vaultId\":\"3256RF36EB62204E61B7389377C71774\", \"index\": 0}]";
        assertEquals(HttpStatus.OK, actualResponse.getStatusCode());
        JSONAssert.assertEquals(expectedResponse, actualResponse.getBody(), false);
    }

    @Test
    void shouldReturnVaultIdForExistingPassword() {
        List<VaultRequest> vaultEntriesRequest = new ArrayList<>();
        vaultEntriesRequest.add(buildVaultRequest(DATA_TYPE_PASSWORD, "testPassword@1", 0));
        HttpEntity<List> requestEntity = new HttpEntity<>(vaultEntriesRequest, setRequestHeaders());

        ResponseEntity<String> actualResponse = testRestTemplate.exchange(getVaultEntriesUrl(), HttpMethod.POST,
                requestEntity, new ParameterizedTypeReference<>() {
                });

        String expectedResponse = "[{\"vaultId\":\"789B2676EB62204E61B7389377C71567\", \"index\": 0}]";
        assertEquals(HttpStatus.OK, actualResponse.getStatusCode());
        JSONAssert.assertEquals(expectedResponse, actualResponse.getBody(), false);
    }

    @Disabled
    @Test
    void shouldReturnVaultIdsForNewGiftCardData() {
        List<VaultRequest> vaultEntriesRequest = new ArrayList<>();
        vaultEntriesRequest.add(buildVaultRequest(DATA_TYPE_GIFT_CARD_TRACK2, "5166456789011996", 0));
        vaultEntriesRequest.add(buildVaultRequest(DATA_TYPE_GIFT_CARD_PIN, "9078", 1));
        vaultEntriesRequest.add(buildVaultRequest(DATA_TYPE_GIFT_CARD_NUMBER, "3629338681411112", 2));
        HttpEntity<List> requestEntity = new HttpEntity<>(vaultEntriesRequest, setRequestHeaders());

        ResponseEntity<String> actualResponse = testRestTemplate.exchange(getVaultEntriesUrl(), HttpMethod.POST,
                requestEntity, new ParameterizedTypeReference<>() {
                });

        assertEquals(HttpStatus.OK, actualResponse.getStatusCode());
        assertNotNull(actualResponse.getBody());
        assertEquals(3, StringUtils.countMatches(actualResponse.getBody(), "\"vaultId\":"));
    }

    @Disabled
    @Test
    void shouldReturnVaultIdForNewCreditCardData() throws JsonProcessingException {
        List<VaultRequest> vaultEntriesRequest = new ArrayList<>();
        vaultEntriesRequest.add(buildVaultRequest(DATA_TYPE_CREDIT_CARD_EXPIRY_YEAR, "2035", 0));
        vaultEntriesRequest.add(buildVaultRequest(DATA_TYPE_CREDIT_CARD_EXPIRY_MONTH, "07", 1));
        vaultEntriesRequest.add(buildVaultRequest(DATA_TYPE_CREDIT_CARD_NUMBER, "3629338681411112", 2));
        HttpEntity<List> requestEntity = new HttpEntity<>(vaultEntriesRequest, setRequestHeaders());

        setMockWebServiceTemplateForVoltage();
        when(webServiceTemplate.marshalSendAndReceive(anyString(), any(), any()))
                .thenReturn(getVoltageResponse("3629398687211112"));
        mockBluefinResponse("3629479495211112", "3629338681411112");

        ResponseEntity<String> actualResponse = testRestTemplate.exchange(getVaultEntriesUrl(), HttpMethod.POST,
                requestEntity, new ParameterizedTypeReference<>() {
                });

        assertEquals(HttpStatus.OK, actualResponse.getStatusCode());
        assertNotNull(actualResponse.getBody());
        assertEquals(3, StringUtils.countMatches(actualResponse.getBody(), "\"vaultId\":"));
    }

    @Disabled
    @Test
    void shouldReturnVaultIdForNewPassword() {
        List<VaultRequest> vaultEntriesRequest = new ArrayList<>();
        vaultEntriesRequest.add(buildVaultRequest(DATA_TYPE_PASSWORD, "testPassword@new", 0));
        HttpEntity<List> requestEntity = new HttpEntity<>(vaultEntriesRequest, setRequestHeaders());

        ResponseEntity<String> actualResponse = testRestTemplate.exchange(getVaultEntriesUrl(), HttpMethod.POST,
                requestEntity, new ParameterizedTypeReference<>() {
                });

        assertEquals(HttpStatus.OK, actualResponse.getStatusCode());
        assertNotNull(actualResponse.getBody());
        assertEquals(1, StringUtils.countMatches(actualResponse.getBody(), "\"vaultId\":"));
    }

    @Test
    void shouldReturn400WhenIndexesNotUnique() {
        List<VaultRequest> vaultEntriesRequest = new ArrayList<>();
        vaultEntriesRequest.add(buildVaultRequest(DATA_TYPE_CREDIT_CARD_NUMBER, "3629338681411112", 0));
        vaultEntriesRequest.add(buildVaultRequest(DATA_TYPE_GIFT_CARD_NUMBER, "3629338681411112", 0));
        HttpEntity<List> requestEntity = new HttpEntity<>(vaultEntriesRequest, setRequestHeaders());

        ResponseEntity<String> actualResponse = testRestTemplate.exchange(getVaultEntriesUrl(), HttpMethod.POST,
                requestEntity, new ParameterizedTypeReference<>() {
                });

        String expectedResponse = "{\"developerMessage\": \"Failed to process the request. Index: 0\"," +
                "\"userMessage\": \"Indexes are not unique.\"," +
                "\"errorCode\": 1,\"moreInfo\": null}";
        assertEquals(HttpStatus.BAD_REQUEST, actualResponse.getStatusCode());
        JSONAssert.assertEquals(expectedResponse, actualResponse.getBody(), false);
    }

    @Test
    void shouldReturn400WhenIndexIsMissing() {
        List<VaultRequest> vaultEntriesRequest = new ArrayList<>();
        vaultEntriesRequest.add(VaultRequest.builder().type(DATA_TYPE_CREDIT_CARD_NUMBER).plaintext("3629338681411112").build());
        HttpEntity<List> requestEntity = new HttpEntity<>(vaultEntriesRequest, setRequestHeaders());

        ResponseEntity<String> actualResponse = testRestTemplate.exchange(getVaultEntriesUrl(), HttpMethod.POST,
                requestEntity, new ParameterizedTypeReference<>() {
                });

        String expectedResponse = "{\"developerMessage\": null," +
                "\"userMessage\": \"Index, type or plaintext is missing.\"," +
                "\"errorCode\": 3,\"moreInfo\": null}";
        assertEquals(HttpStatus.BAD_REQUEST, actualResponse.getStatusCode());
        JSONAssert.assertEquals(expectedResponse, actualResponse.getBody(), false);
    }

    @Test
    void shouldReturn500WhenBluefinTokenizationFails() {
        mockBluefinResponseWithError();
        when(webServiceTemplate.marshalSendAndReceive(anyString(), any(), any()))
                .thenReturn(getVoltageResponse("4111110343851111"));

        List<VaultRequest> vaultEntriesRequest = new ArrayList<>();
        vaultEntriesRequest.add(buildVaultRequest(DATA_TYPE_CREDIT_CARD_NUMBER, "4111110033311111", 0));
        HttpEntity<List> requestEntity = new HttpEntity<>(vaultEntriesRequest, setRequestHeaders());

        ResponseEntity<String> actualResponse = testRestTemplate.exchange(getVaultEntriesUrl(), HttpMethod.POST,
                requestEntity, new ParameterizedTypeReference<>() {
                });

        String expectedResponse = "{\"developerMessage\":null,\"userMessage\":\"Unable to tokenize the given data.\"," +
                "\"errorCode\":29,\"moreInfo\":\"Please check the input data\"}";
        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, actualResponse.getStatusCode());
        assertEquals(expectedResponse, actualResponse.getBody());
    }

    @Test
    void shouldReturn400ForInvalidType() {
        List<VaultRequest> vaultEntriesRequest = new ArrayList<>();
        vaultEntriesRequest.add(VaultRequest.builder().index(0).plaintext("3629338681411112").build());
        HttpEntity<List> requestEntity = new HttpEntity<>(vaultEntriesRequest, setRequestHeaders());

        ResponseEntity<String> actualResponse = testRestTemplate.exchange(getVaultEntriesUrl(), HttpMethod.POST,
                requestEntity, new ParameterizedTypeReference<>() {
                });

        String expectedResponse = "{\"developerMessage\": \"Failed to process the request. Index: 0\"," +
                "\"userMessage\": \"Index, type or plaintext is missing.\"," +
                "\"errorCode\": 3,\"moreInfo\": null}";
        assertEquals(HttpStatus.BAD_REQUEST, actualResponse.getStatusCode());
        JSONAssert.assertEquals(expectedResponse, actualResponse.getBody(), false);
    }

    @Test
    void shouldReturn400WhenPlainTextIsMissingInRequest() {
        List<VaultRequest> vaultEntriesRequest = new ArrayList<>();
        vaultEntriesRequest.add(VaultRequest.builder().type(DATA_TYPE_PASSWORD).index(0).build());
        HttpEntity<List> requestEntity = new HttpEntity<>(vaultEntriesRequest, setRequestHeaders());

        ResponseEntity<String> actualResponse = testRestTemplate.exchange(getVaultEntriesUrl(), HttpMethod.POST,
                requestEntity, new ParameterizedTypeReference<>() {
                });

        String expectedResponse = "{\"developerMessage\": \"Failed to process the request. Index: 0\"," +
                "\"userMessage\": \"Index, type or plaintext is missing.\"," +
                "\"errorCode\": 3,\"moreInfo\": null}";
        assertEquals(HttpStatus.BAD_REQUEST, actualResponse.getStatusCode());
        JSONAssert.assertEquals(expectedResponse, actualResponse.getBody(), false);
    }

    @Test
    void shouldReturn400WhenTypeIsMissingInRequest() {
        List<VaultRequest> vaultEntriesRequest = new ArrayList<>();
        vaultEntriesRequest.add(VaultRequest.builder().plaintext("3629338681411112").index(0).build());
        HttpEntity<List> requestEntity = new HttpEntity<>(vaultEntriesRequest, setRequestHeaders());

        ResponseEntity<String> actualResponse = testRestTemplate.exchange(getVaultEntriesUrl(), HttpMethod.POST,
                requestEntity, new ParameterizedTypeReference<>() {
                });

        String expectedResponse = "{\"developerMessage\": \"Failed to process the request. Index: 0\"," +
                "\"userMessage\": \"Index, type or plaintext is missing.\"," +
                "\"errorCode\": 3,\"moreInfo\": null}";
        assertEquals(HttpStatus.BAD_REQUEST, actualResponse.getStatusCode());
        JSONAssert.assertEquals(expectedResponse, actualResponse.getBody(), false);
    }

    @Test
    void shouldReturn400ForInvalidCreditCardMinLength() {
        List<VaultRequest> vaultEntriesRequest = new ArrayList<>();
        vaultEntriesRequest.add(buildVaultRequest(DATA_TYPE_CREDIT_CARD_NUMBER, "510510510510", 0));
        HttpEntity<List> requestEntity = new HttpEntity<>(vaultEntriesRequest, setRequestHeaders());

        ResponseEntity<String> actualResponse = testRestTemplate.exchange(getVaultEntriesUrl(), HttpMethod.POST,
                requestEntity, new ParameterizedTypeReference<>() {
                });

        String expectedResponse = "{\"developerMessage\": \"Failed to process the request. Index: 0\"," +
                "\"userMessage\": \"Invalid credit card length - maximum allowed length is 20 and minimum allowed length is 13.\"," +
                "\"errorCode\": 11,\"moreInfo\": \"Please enter valid credit card number\"}";
        assertEquals(HttpStatus.BAD_REQUEST, actualResponse.getStatusCode());
        JSONAssert.assertEquals(expectedResponse, actualResponse.getBody(), false);
    }

    @Test
    void shouldReturn400ForInvalidCreditCardMaxLength() {
        List<VaultRequest> vaultEntriesRequest = new ArrayList<>();
        vaultEntriesRequest.add(buildVaultRequest(DATA_TYPE_CREDIT_CARD_NUMBER, "510510510510510510510510", 0));
        HttpEntity<List> requestEntity = new HttpEntity<>(vaultEntriesRequest, setRequestHeaders());

        ResponseEntity<String> actualResponse = testRestTemplate.exchange(getVaultEntriesUrl(), HttpMethod.POST,
                requestEntity, new ParameterizedTypeReference<>() {
                });

        String expectedResponse = "{\"developerMessage\": \"Failed to process the request. Index: 0\"," +
                "\"userMessage\": \"Invalid credit card length - maximum allowed length is 20 and minimum allowed length is 13.\"," +
                "\"errorCode\": 11,\"moreInfo\": \"Please enter valid credit card number\"}";
        assertEquals(HttpStatus.BAD_REQUEST, actualResponse.getStatusCode());
        JSONAssert.assertEquals(expectedResponse, actualResponse.getBody(), false);
    }

    @Test
    void shouldReturn400ForInvalidCreditCardNumber() {
        List<VaultRequest> vaultEntriesRequest = new ArrayList<>();
        vaultEntriesRequest.add(buildVaultRequest(DATA_TYPE_CREDIT_CARD_NUMBER, "510510510A105100", 0));
        HttpEntity<List> requestEntity = new HttpEntity<>(vaultEntriesRequest, setRequestHeaders());

        ResponseEntity<String> actualResponse = testRestTemplate.exchange(getVaultEntriesUrl(), HttpMethod.POST,
                requestEntity, new ParameterizedTypeReference<>() {
                });

        String expectedResponse = "{\"developerMessage\": \"Failed to process the request. Index: 0\"," +
                "\"userMessage\": \"Some credit card numbers are invalid.\"," +
                "\"errorCode\": 5,\"moreInfo\": null}";
        assertEquals(HttpStatus.BAD_REQUEST, actualResponse.getStatusCode());
        JSONAssert.assertEquals(expectedResponse, actualResponse.getBody(), false);
    }

    @Test
    void shouldReturn400ForInvalidCreditCardExpiryYear() {
        List<VaultRequest> vaultEntriesRequest = new ArrayList<>();
        vaultEntriesRequest.add(buildVaultRequest(DATA_TYPE_CREDIT_CARD_EXPIRY_YEAR, "2BA2", 0));
        HttpEntity<List> requestEntity = new HttpEntity<>(vaultEntriesRequest, setRequestHeaders());

        ResponseEntity<String> actualResponse = testRestTemplate.exchange(getVaultEntriesUrl(), HttpMethod.POST,
                requestEntity, new ParameterizedTypeReference<>() {
                });

        String expectedResponse = "{\"developerMessage\": \"Failed to process the request. Index: 0\"," +
                "\"userMessage\": \"Some credit card numbers are invalid.\"," +
                "\"errorCode\": 5,\"moreInfo\": null}";
        assertEquals(HttpStatus.BAD_REQUEST, actualResponse.getStatusCode());
        JSONAssert.assertEquals(expectedResponse, actualResponse.getBody(), false);
    }

    @Test
    void shouldReturn400ForInvalidAlphaNumericCreditCardExpiryMonth() {
        List<VaultRequest> vaultEntriesRequest = new ArrayList<>();
        vaultEntriesRequest.add(buildVaultRequest(DATA_TYPE_CREDIT_CARD_EXPIRY_MONTH, "2B", 0));
        HttpEntity<List> requestEntity = new HttpEntity<>(vaultEntriesRequest, setRequestHeaders());

        ResponseEntity<String> actualResponse = testRestTemplate.exchange(getVaultEntriesUrl(), HttpMethod.POST,
                requestEntity, new ParameterizedTypeReference<>() {
                });

        String expectedResponse = "{\"developerMessage\": \"Failed to process the request. Index: 0\"," +
                "\"userMessage\": \"Some credit card numbers are invalid.\"," +
                "\"errorCode\": 5,\"moreInfo\": null}";
        assertEquals(HttpStatus.BAD_REQUEST, actualResponse.getStatusCode());
        JSONAssert.assertEquals(expectedResponse, actualResponse.getBody(), false);
    }

    @Test
    void shouldReturn400ForInvalidGiftCardNumberMinLength() {
        List<VaultRequest> vaultEntriesRequest = new ArrayList<>();
        vaultEntriesRequest.add(buildVaultRequest(DATA_TYPE_GIFT_CARD_NUMBER, "5205105105101", 0));
        HttpEntity<List> requestEntity = new HttpEntity<>(vaultEntriesRequest, setRequestHeaders());

        ResponseEntity<String> actualResponse = testRestTemplate.exchange(getVaultEntriesUrl(), HttpMethod.POST,
                requestEntity, new ParameterizedTypeReference<>() {
                });

        String expectedResponse = "{\"developerMessage\": \"Failed to process the request. Index: 0\"," +
                "\"userMessage\": \"Invalid gift card length - Maximum allowed length is 20 and Minimum allowed length is 16\"," +
                "\"errorCode\": 6,\"moreInfo\": null}";
        assertEquals(HttpStatus.BAD_REQUEST, actualResponse.getStatusCode());
        JSONAssert.assertEquals(expectedResponse, actualResponse.getBody(), false);
    }

    @Test
    void shouldReturn400ForInvalidGiftCardNumberMaxLength() {
        List<VaultRequest> vaultEntriesRequest = new ArrayList<>();
        vaultEntriesRequest.add(buildVaultRequest(DATA_TYPE_GIFT_CARD_NUMBER, "52051051051015205105105101", 0));
        HttpEntity<List> requestEntity = new HttpEntity<>(vaultEntriesRequest, setRequestHeaders());

        ResponseEntity<String> actualResponse = testRestTemplate.exchange(getVaultEntriesUrl(), HttpMethod.POST,
                requestEntity, new ParameterizedTypeReference<>() {
                });

        String expectedResponse = "{\"developerMessage\": \"Failed to process the request. Index: 0\"," +
                "\"userMessage\": \"Invalid gift card length - Maximum allowed length is 20 and Minimum allowed length is 16\"," +
                "\"errorCode\": 6,\"moreInfo\": null}";
        assertEquals(HttpStatus.BAD_REQUEST, actualResponse.getStatusCode());
        JSONAssert.assertEquals(expectedResponse, actualResponse.getBody(), false);
    }

    @Test
    void shouldReturn400ForInvalidGiftCardNumber() {
        List<VaultRequest> vaultEntriesRequest = new ArrayList<>();
        vaultEntriesRequest.add(buildVaultRequest(DATA_TYPE_GIFT_CARD_NUMBER, "520510510A105101", 0));
        HttpEntity<List> requestEntity = new HttpEntity<>(vaultEntriesRequest, setRequestHeaders());

        ResponseEntity<String> actualResponse = testRestTemplate.exchange(getVaultEntriesUrl(), HttpMethod.POST,
                requestEntity, new ParameterizedTypeReference<>() {
                });

        String expectedResponse = "{\"developerMessage\": \"Failed to process the request. Index: 0\"," +
                "\"userMessage\": \"Some gift card numbers are invalid.Only digits are allowed.\"," +
                "\"errorCode\": 7,\"moreInfo\": null}";
        assertEquals(HttpStatus.BAD_REQUEST, actualResponse.getStatusCode());
        JSONAssert.assertEquals(expectedResponse, actualResponse.getBody(), false);
    }

    @Test
    void shouldReturn400ForInvalidGiftCardTrack2MinLength() {
        List<VaultRequest> vaultEntriesRequest = new ArrayList<>();
        vaultEntriesRequest.add(buildVaultRequest(DATA_TYPE_GIFT_CARD_TRACK2, "5205105105101", 0));
        HttpEntity<List> requestEntity = new HttpEntity<>(vaultEntriesRequest, setRequestHeaders());

        ResponseEntity<String> actualResponse = testRestTemplate.exchange(getVaultEntriesUrl(), HttpMethod.POST,
                requestEntity, new ParameterizedTypeReference<>() {
                });

        String expectedResponse = "{\"developerMessage\": \"Failed to process the request. Index: 0\"," +
                "\"userMessage\": \"Invalid gift card track2 length - Maximum allowed length is 64 and Minimum allowed length is 16.\"," +
                "\"errorCode\": 13,\"moreInfo\": null}";
        assertEquals(HttpStatus.BAD_REQUEST, actualResponse.getStatusCode());
        JSONAssert.assertEquals(expectedResponse, actualResponse.getBody(), false);
    }

    @Test
    void shouldReturn400ForInvalidGiftCardTrack2MaxLength() {
        List<VaultRequest> vaultEntriesRequest = new ArrayList<>();
        vaultEntriesRequest.add(buildVaultRequest(DATA_TYPE_GIFT_CARD_TRACK2, "5205105105101", 0));
        HttpEntity<List> requestEntity = new HttpEntity<>(vaultEntriesRequest, setRequestHeaders());

        ResponseEntity<String> actualResponse = testRestTemplate.exchange(getVaultEntriesUrl(), HttpMethod.POST,
                requestEntity, new ParameterizedTypeReference<>() {
                });

        String expectedResponse = "{\"developerMessage\": \"Failed to process the request. Index: 0\"," +
                "\"userMessage\": \"Invalid gift card track2 length - Maximum allowed length is 64 and Minimum allowed length is 16.\"," +
                "\"errorCode\": 13,\"moreInfo\": null}";
        assertEquals(HttpStatus.BAD_REQUEST, actualResponse.getStatusCode());
        JSONAssert.assertEquals(expectedResponse, actualResponse.getBody(), false);
    }

    @Test
    void shouldReturn400ForInvalidGiftCardPin() {
        List<VaultRequest> vaultEntriesRequest = new ArrayList<>();
        vaultEntriesRequest.add(buildVaultRequest(DATA_TYPE_GIFT_CARD_PIN, "167810A105101", 0));
        HttpEntity<List> requestEntity = new HttpEntity<>(vaultEntriesRequest, setRequestHeaders());

        ResponseEntity<String> actualResponse = testRestTemplate.exchange(getVaultEntriesUrl(), HttpMethod.POST,
                requestEntity, new ParameterizedTypeReference<>() {
                });

        String expectedResponse = "{\"developerMessage\": \"Failed to process the request. Index: 0\"," +
                "\"userMessage\": \"Some gift card pin numbers are invalid.Only digits are allowed.\"," +
                "\"errorCode\": 10,\"moreInfo\": null}";
        assertEquals(HttpStatus.BAD_REQUEST, actualResponse.getStatusCode());
        JSONAssert.assertEquals(expectedResponse, actualResponse.getBody(), false);
    }

    @Test
    void shouldReturn400ForInvalidGiftCardPinMinLength() {
        List<VaultRequest> vaultEntriesRequest = new ArrayList<>();
        vaultEntriesRequest.add(buildVaultRequest(DATA_TYPE_GIFT_CARD_PIN, "333", 0));
        HttpEntity<List> requestEntity = new HttpEntity<>(vaultEntriesRequest, setRequestHeaders());

        ResponseEntity<String> actualResponse = testRestTemplate.exchange(getVaultEntriesUrl(), HttpMethod.POST,
                requestEntity, new ParameterizedTypeReference<>() {
                });

        String expectedResponse = "{\"developerMessage\": \"Failed to process the request. Index: 0\"," +
                "\"userMessage\": \"Invalid Gift Card Pin Length\"," +
                "\"errorCode\": 10,\"moreInfo\": null}";
        assertEquals(HttpStatus.BAD_REQUEST, actualResponse.getStatusCode());
        JSONAssert.assertEquals(expectedResponse, actualResponse.getBody(), false);
    }

    @Test
    void shouldReturn400ForInvalidGiftCardPinMaxLength() {
        List<VaultRequest> vaultEntriesRequest = new ArrayList<>();
        vaultEntriesRequest.add(buildVaultRequest(DATA_TYPE_GIFT_CARD_PIN, "333357897890124567890", 0));
        HttpEntity<List> requestEntity = new HttpEntity<>(vaultEntriesRequest, setRequestHeaders());

        ResponseEntity<String> actualResponse = testRestTemplate.exchange(getVaultEntriesUrl(), HttpMethod.POST,
                requestEntity, new ParameterizedTypeReference<>() {
                });

        String expectedResponse = "{\"developerMessage\": \"Failed to process the request. Index: 0\"," +
                "\"userMessage\": \"Invalid Gift Card Pin Length\"," +
                "\"errorCode\": 10,\"moreInfo\": null}";
        assertEquals(HttpStatus.BAD_REQUEST, actualResponse.getStatusCode());
        JSONAssert.assertEquals(expectedResponse, actualResponse.getBody(), false);
    }

    @Test
    void shouldReturn400ForInvalidCreditCardExpiryMonth() {
        List<VaultRequest> vaultEntriesRequest = new ArrayList<>();
        vaultEntriesRequest.add(buildVaultRequest(DATA_TYPE_CREDIT_CARD_EXPIRY_MONTH, "33", 0));
        HttpEntity<List> requestEntity = new HttpEntity<>(vaultEntriesRequest, setRequestHeaders());

        ResponseEntity<String> actualResponse = testRestTemplate.exchange(getVaultEntriesUrl(), HttpMethod.POST,
                requestEntity, new ParameterizedTypeReference<>() {
                });

        String expectedResponse = "{\"developerMessage\": \"Failed to process the request. Index: 0\"," +
                "\"userMessage\": \"Invalid credit card expiry month\"," +
                "\"errorCode\": 5,\"moreInfo\": null}";
        assertEquals(HttpStatus.BAD_REQUEST, actualResponse.getStatusCode());
        JSONAssert.assertEquals(expectedResponse, actualResponse.getBody(), false);
    }

    @Test
    void shouldReturn400ForInvalidCreditCardExpiryMonthMinLength() {
        List<VaultRequest> vaultEntriesRequest = new ArrayList<>();
        vaultEntriesRequest.add(buildVaultRequest(DATA_TYPE_CREDIT_CARD_EXPIRY_MONTH, "2", 0));
        HttpEntity<List> requestEntity = new HttpEntity<>(vaultEntriesRequest, setRequestHeaders());

        ResponseEntity<String> actualResponse = testRestTemplate.exchange(getVaultEntriesUrl(), HttpMethod.POST,
                requestEntity, new ParameterizedTypeReference<>() {
                });

        String expectedResponse = "{\"developerMessage\": \"Failed to process the request. Index: 0\"," +
                "\"userMessage\": \"Invalid credit card expiry month - maximum allowed length is 2 and minimum allowed length is 2.\"," +
                "\"errorCode\": 5,\"moreInfo\": null}";
        assertEquals(HttpStatus.BAD_REQUEST, actualResponse.getStatusCode());
        JSONAssert.assertEquals(expectedResponse, actualResponse.getBody(), false);
    }

    @Test
    void shouldReturn400ForInvalidCreditCardExpiryMonthMaxLength() {
        List<VaultRequest> vaultEntriesRequest = new ArrayList<>();
        vaultEntriesRequest.add(buildVaultRequest(DATA_TYPE_CREDIT_CARD_EXPIRY_MONTH, "333", 0));
        HttpEntity<List> requestEntity = new HttpEntity<>(vaultEntriesRequest, setRequestHeaders());

        ResponseEntity<String> actualResponse = testRestTemplate.exchange(getVaultEntriesUrl(), HttpMethod.POST,
                requestEntity, new ParameterizedTypeReference<>() {
                });

        String expectedResponse = "{\"developerMessage\": \"Failed to process the request. Index: 0\"," +
                "\"userMessage\": \"Invalid credit card expiry month - maximum allowed length is 2 and minimum allowed length is 2.\"," +
                "\"errorCode\": 5,\"moreInfo\": null}";
        assertEquals(HttpStatus.BAD_REQUEST, actualResponse.getStatusCode());
        JSONAssert.assertEquals(expectedResponse, actualResponse.getBody(), false);
    }

    @Test
    void shouldReturn400ForInvalidCreditCardExpiryYearMaxLength() {
        List<VaultRequest> vaultEntriesRequest = new ArrayList<>();
        vaultEntriesRequest.add(buildVaultRequest(DATA_TYPE_CREDIT_CARD_EXPIRY_YEAR, "26783", 0));
        HttpEntity<List> requestEntity = new HttpEntity<>(vaultEntriesRequest, setRequestHeaders());

        ResponseEntity<String> actualResponse = testRestTemplate.exchange(getVaultEntriesUrl(), HttpMethod.POST,
                requestEntity, new ParameterizedTypeReference<>() {
                });

        String expectedResponse = "{\"developerMessage\": \"Failed to process the request. Index: 0\"," +
                "\"userMessage\": \"Invalid credit card expiry year length - maximum allowed length is 4 and minimum allowed length is 2.\"," +
                "\"errorCode\": 5,\"moreInfo\": null}";
        assertEquals(HttpStatus.BAD_REQUEST, actualResponse.getStatusCode());
        JSONAssert.assertEquals(expectedResponse, actualResponse.getBody(), false);
    }

    @Test
    void shouldReturn400ForInvalidCreditCardExpiryYearMinLength() {
        List<VaultRequest> vaultEntriesRequest = new ArrayList<>();
        vaultEntriesRequest.add(buildVaultRequest(DATA_TYPE_CREDIT_CARD_EXPIRY_YEAR, "2", 0));
        HttpEntity<List> requestEntity = new HttpEntity<>(vaultEntriesRequest, setRequestHeaders());

        ResponseEntity<String> actualResponse = testRestTemplate.exchange(getVaultEntriesUrl(), HttpMethod.POST,
                requestEntity, new ParameterizedTypeReference<>() {
                });

        String expectedResponse = "{\"developerMessage\": \"Failed to process the request. Index: 0\"," +
                "\"userMessage\": \"Invalid credit card expiry year length - maximum allowed length is 4 and minimum allowed length is 2.\"," +
                "\"errorCode\": 5,\"moreInfo\": null}";
        assertEquals(HttpStatus.BAD_REQUEST, actualResponse.getStatusCode());
        JSONAssert.assertEquals(expectedResponse, actualResponse.getBody(), false);
    }

    @Test
    void shouldReturn400ForRequestDataIsEmptyString() {
        List<VaultRequest> vaultEntriesRequest = new ArrayList<>();
        vaultEntriesRequest.add(buildVaultRequest("", "", 22));
        HttpEntity<List> requestEntity = new HttpEntity<>(vaultEntriesRequest, setRequestHeaders());

        ResponseEntity<String> actualResponse = testRestTemplate.exchange(getVaultEntriesUrl(), HttpMethod.POST,
                requestEntity, new ParameterizedTypeReference<>() {
                });

        String expectedResponse = "{\"developerMessage\": \"Failed to process the request. Index: 22\"," +
                "\"userMessage\": \"Index, type or plaintext is missing.\"," +
                "\"errorCode\": 3,\"moreInfo\": null}";
        assertEquals(HttpStatus.BAD_REQUEST, actualResponse.getStatusCode());
        JSONAssert.assertEquals(expectedResponse, actualResponse.getBody(), false);
    }

    private void mockBluefinResponse(String token, String plainText) throws JsonProcessingException {
        new MockServerClient("localhost", MOCK_SERVER_DEFINED_PORT).when(
                request().withMethod("POST")
                        .withPath("/api/tokenization/tokenize")
                        .withHeaders(request().getHeaders())
                        .withBody(RegexBody.regex(".*" + plainText + ".*")))
                .respond(
                        response().withStatusCode(200)
                                .withBody(getTokenizeResponseAsString(token), MediaType.APPLICATION_JSON)
                );
    }

    private void mockBluefinResponseWithError() {
        new MockServerClient("localhost", MOCK_SERVER_DEFINED_PORT).when(
                request().withMethod("POST")
                        .withPath("/api/tokenization/tokenize")
                        .withHeaders(request().getHeaders())
                        .withBody(RegexBody.regex(".*4111110033311111.*")))
                .respond(
                        response().withStatusCode(500)
                );
    }

    private HttpHeaders setRequestHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);
        headers.setAccept(Collections.singletonList(org.springframework.http.MediaType.APPLICATION_JSON));
        return headers;
    }

    private String getTokenizeResponseAsString(String token) throws JsonProcessingException {
        TokenizeResponse tokenizeResponse = TokenizeResponse.builder()
                .bfid("test-blufin-id")
                .messageId("test-message-id")
                .reference("test-reference")
                .values(Arrays.asList(Values.builder()
                        .value(token)
                        .name("scx_token_card_number")
                        .build()))
                .build();
        return objectMapper.writeValueAsString(tokenizeResponse);
    }

    private ProtectFormattedDataResponse getVoltageResponse(String token) {
        ProtectFormattedDataResponse protectFormattedDataResponse = new ProtectFormattedDataResponse();
        protectFormattedDataResponse.setDataOut(token);
        return protectFormattedDataResponse;
    }

    private VaultRequest buildVaultRequest(String type, String plainText, int index) {
        return VaultRequest.builder().type(type).plaintext(plainText).index(index).build();
    }

    private String getVaultEntriesUrl() {
        return "http://localhost:" + port + "/vault-entries";
    }

    private void setMockWebServiceTemplateForVoltage() {
        webServiceGatewaySupport.setWebServiceTemplate(webServiceTemplate);
    }
}

