package com.gap.gid.security.client;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gap.gid.security.dto.BluefinPropertiesDTO;
import com.gap.gid.security.exception.BluefinException;
import com.gap.gid.security.model.BulkDeTokenizeRequest;
import com.gap.gid.security.model.BulkDeTokenizeResponse;
import com.gap.gid.security.model.BulkTokenizeRequest;
import com.gap.gid.security.model.BulkTokenizeResponse;
import com.gap.gid.security.model.DeTokenizeRequestData;
import com.gap.gid.security.model.DeTokenizeResponse;
import com.gap.gid.security.model.TokenizeRequestData;
import com.gap.gid.security.model.TokenizeResponse;
import com.gap.gid.security.model.Values;
import io.github.resilience4j.retry.RetryRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.endsWith;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(SpringExtension.class)
@EnableConfigurationProperties(value = BluefinPropertiesDTO.class)
@TestPropertySource({"classpath:application-bluefin.properties"})
public class ResilientBluefinRestClientTest {

    @Mock
    private RestTemplate restTemplateTokenize;
    @Mock
    private RestTemplate restTemplateBulkTokenize;
    @Mock
    private RestTemplate restTemplateDetokenize;
    @Mock
    private RestTemplate restTemplateBulkDetokenize;

    @Autowired
    BluefinPropertiesDTO bluefinPropertiesDTO;

    @Mock
    RetryRegistry registry;

    @InjectMocks
    private ResilientBluefinRestClient resilientBluefinRestClient;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        ReflectionTestUtils.setField(resilientBluefinRestClient, "objectMapper", new ObjectMapper());
        ReflectionTestUtils.setField(resilientBluefinRestClient, "bluefinProperties", bluefinPropertiesDTO);
    }

    private static final String SCX_TOKEN_CARD_NUMBER = "scx_token_card_number";
    private static final String SCX_GIFT_CARD_NUMBER = "gift_card_number";

    @Test
    void shouldReturnBluefinTokenSuccessfully() throws BluefinException {
        when(restTemplateTokenize.exchange(endsWith("/tokenization/tokenize"), eq(HttpMethod.POST), any(HttpEntity.class),
                any(ParameterizedTypeReference.class)))
                .thenReturn(new ResponseEntity<>(getTokenizeResponse(SCX_TOKEN_CARD_NUMBER), HttpStatus.OK));
        TokenizeRequestData tokenizeRequestData = buildTokenizeRequest(SCX_TOKEN_CARD_NUMBER);

        ResponseEntity<TokenizeResponse> response = resilientBluefinRestClient.tokenize(tokenizeRequestData);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("test-blufin-id", response.getBody().getBfid());
        assertEquals("5178133333311111", response.getBody().getValues().get(0).getValue());
        verify(restTemplateTokenize, times(1)).exchange(endsWith("/tokenization/tokenize"),
                eq(HttpMethod.POST), any(HttpEntity.class), any(ParameterizedTypeReference.class));
    }

    @Test
    void shouldReturnBluefinTokenSuccessfullyForGiftCardNumber() throws BluefinException {
        when(restTemplateTokenize.exchange(endsWith("/tokenization/tokenize"), eq(HttpMethod.POST), any(HttpEntity.class),
                any(ParameterizedTypeReference.class)))
                .thenReturn(new ResponseEntity<>(getTokenizeResponse(SCX_GIFT_CARD_NUMBER), HttpStatus.OK));
        TokenizeRequestData tokenizeRequestData = buildTokenizeRequest(SCX_GIFT_CARD_NUMBER);

        ResponseEntity<TokenizeResponse> response = resilientBluefinRestClient.tokenize(tokenizeRequestData);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("test-blufin-id", response.getBody().getBfid());
        assertEquals("5178133333311111", response.getBody().getValues().get(0).getValue());
        verify(restTemplateTokenize, times(1)).exchange(endsWith("/tokenization/tokenize"),
                eq(HttpMethod.POST), any(HttpEntity.class), any(ParameterizedTypeReference.class));
    }

    @Test
    @Disabled
    void shouldRetryOnTimeOutException() {
        when(restTemplateTokenize.exchange(endsWith("/tokenization/tokenize"), eq(HttpMethod.POST), any(HttpEntity.class),
                any(ParameterizedTypeReference.class)))
                .thenThrow((new ResourceAccessException("nested exception is java.net.SocketTimeoutException: Read timed out")));
        TokenizeRequestData tokenizeRequestData = buildTokenizeRequest(SCX_TOKEN_CARD_NUMBER);

        assertThrows(ResourceAccessException.class, () -> {
            resilientBluefinRestClient.tokenize(tokenizeRequestData);
        });
        verify(restTemplateTokenize, times(3)).exchange(endsWith("/tokenization/tokenize"),
                eq(HttpMethod.POST), any(HttpEntity.class), any(ParameterizedTypeReference.class));
    }

    @Test
    void shouldReturnBluefinTokensSuccessfully() throws BluefinException {
        when(restTemplateBulkTokenize.exchange(endsWith("/batch/tokenize"), eq(HttpMethod.POST), any(HttpEntity.class),
                any(ParameterizedTypeReference.class)))
                .thenReturn(new ResponseEntity<>(getBulkTokenizeResponse(), HttpStatus.OK));
        BulkTokenizeRequest bulkTokenizeRequest = buildBulkTokenizeRequest(SCX_TOKEN_CARD_NUMBER);

        ResponseEntity<BulkTokenizeResponse> response = resilientBluefinRestClient.bulkTokenize(bulkTokenizeRequest);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(2, response.getBody().getBatches().size());
        verify(restTemplateBulkTokenize, times(1)).exchange(endsWith("/batch/tokenize"),
                eq(HttpMethod.POST), any(HttpEntity.class), any(ParameterizedTypeReference.class));
    }

    @Test
    void shouldReturnBluefinTokensSuccessfullyForGiftCardNumbers() throws BluefinException {
        when(restTemplateBulkTokenize.exchange(endsWith("/batch/tokenize"), eq(HttpMethod.POST), any(HttpEntity.class),
                any(ParameterizedTypeReference.class)))
                .thenReturn(new ResponseEntity<>(getBulkTokenizeResponse(), HttpStatus.OK));
        BulkTokenizeRequest bulkTokenizeRequest = buildBulkTokenizeRequest(SCX_GIFT_CARD_NUMBER);

        ResponseEntity<BulkTokenizeResponse> response = resilientBluefinRestClient.bulkTokenize(bulkTokenizeRequest);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(2, response.getBody().getBatches().size());
        verify(restTemplateBulkTokenize, times(1)).exchange(endsWith("/batch/tokenize"),
                eq(HttpMethod.POST), any(HttpEntity.class), any(ParameterizedTypeReference.class));
    }


    @Test
    void shouldReturnPlaintextFromBluefin() throws BluefinException {
        when(restTemplateDetokenize.exchange(endsWith("/tokenization/detokenize"), eq(HttpMethod.POST), any(HttpEntity.class),
                any(ParameterizedTypeReference.class)))
                .thenReturn(new ResponseEntity<>(getDeTokenizeResponse(SCX_TOKEN_CARD_NUMBER), HttpStatus.OK));
        DeTokenizeRequestData deTokenizeRequestData = buildDeTokenizeRequest(SCX_TOKEN_CARD_NUMBER);

        ResponseEntity<DeTokenizeResponse> response = resilientBluefinRestClient.deTokenize(deTokenizeRequestData);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("5178111111111111", response.getBody().getValues().get(0).getValue());
        verify(restTemplateDetokenize, times(1)).exchange(endsWith("/tokenization/detokenize"),
                eq(HttpMethod.POST), any(HttpEntity.class), any(ParameterizedTypeReference.class));
    }

    @Test
    void shouldReturnPlaintextFromBluefinForGiftCardNumber() throws BluefinException {
        when(restTemplateDetokenize.exchange(endsWith("/tokenization/detokenize"), eq(HttpMethod.POST), any(HttpEntity.class),
                any(ParameterizedTypeReference.class)))
                .thenReturn(new ResponseEntity<>(getDeTokenizeResponse(SCX_GIFT_CARD_NUMBER), HttpStatus.OK));
        DeTokenizeRequestData deTokenizeRequestData = buildDeTokenizeRequest(SCX_GIFT_CARD_NUMBER);

        ResponseEntity<DeTokenizeResponse> response = resilientBluefinRestClient.deTokenize(deTokenizeRequestData);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("5178111111111111", response.getBody().getValues().get(0).getValue());
        verify(restTemplateDetokenize, times(1)).exchange(endsWith("/tokenization/detokenize"),
                eq(HttpMethod.POST), any(HttpEntity.class), any(ParameterizedTypeReference.class));
    }

    @Test
    void shouldReturnBulkPlaintextsFromBluefin() throws BluefinException {
        when(restTemplateBulkDetokenize.exchange(endsWith("/batch/detokenize"), eq(HttpMethod.POST), any(HttpEntity.class),
                any(ParameterizedTypeReference.class)))
                .thenReturn(new ResponseEntity<>(getBulkDeTokenizeResponse(SCX_TOKEN_CARD_NUMBER), HttpStatus.OK));
        BulkDeTokenizeRequest bulkDeTokenizeRequest = buildDeTokenizeBulkRequests(SCX_TOKEN_CARD_NUMBER);

        ResponseEntity<BulkDeTokenizeResponse> response = resilientBluefinRestClient.bulkDetokenize(bulkDeTokenizeRequest);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(2, response.getBody().getBatches().size());
        verify(restTemplateBulkDetokenize, times(1)).exchange(endsWith("/batch/detokenize"),
                eq(HttpMethod.POST), any(HttpEntity.class), any(ParameterizedTypeReference.class));
    }

    @Test
    void shouldReturnBulkPlaintextsFromBluefinForGiftCardNumbers() throws BluefinException {
        when(restTemplateBulkDetokenize.exchange(endsWith("/batch/detokenize"), eq(HttpMethod.POST), any(HttpEntity.class),
                any(ParameterizedTypeReference.class)))
                .thenReturn(new ResponseEntity<>(getBulkDeTokenizeResponse(SCX_GIFT_CARD_NUMBER), HttpStatus.OK));
        BulkDeTokenizeRequest bulkDeTokenizeRequest = buildDeTokenizeBulkRequests(SCX_GIFT_CARD_NUMBER);

        ResponseEntity<BulkDeTokenizeResponse> response = resilientBluefinRestClient.bulkDetokenize(bulkDeTokenizeRequest);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(2, response.getBody().getBatches().size());
        verify(restTemplateBulkDetokenize, times(1)).exchange(endsWith("/batch/detokenize"),
                eq(HttpMethod.POST), any(HttpEntity.class), any(ParameterizedTypeReference.class));
    }

    private TokenizeResponse getTokenizeResponse(String valueName) {
        TokenizeResponse tokenizeResponse = TokenizeResponse.builder()
                .bfid("test-blufin-id")
                .messageId("test-message-id")
                .reference("test-reference")
                .values(Arrays.asList(Values.builder()
                        .value("5178133333311111")
                        .name(valueName)
                        .build()))
                .build();
        return tokenizeResponse;
    }

    private BulkTokenizeResponse getBulkTokenizeResponse() {
        TokenizeResponse tokenizeResponse = TokenizeResponse.builder()
                .bfid("test-blufin-id")
                .reference("0")
                .values(Arrays.asList(Values.builder()
                        .value("5178133333311111")
                        .name("scx_token_card_number")
                        .build()))
                .build();
        TokenizeResponse tokenizeResponse2 = TokenizeResponse.builder()
                .bfid("test-blufin-id")
                .reference("1")
                .values(Arrays.asList(Values.builder()
                        .value("6178133333311111")
                        .name("scx_token_card_number")
                        .build()))
                .build();
        BulkTokenizeResponse bulkTokenizeResponse = BulkTokenizeResponse.builder()
                .reference("test-reference")
                .messageId("test-message-id")
                .batches(Arrays.asList(tokenizeResponse, tokenizeResponse2))
                .build();
        return bulkTokenizeResponse;
    }

    private TokenizeRequestData buildTokenizeRequest(String valueName) {
        return TokenizeRequestData.builder()
                .reference("test123")
                .templateRef("test-template-ref")
                .values(List.of(Values.builder()
                        .name(valueName)
                        .value("5178133333311111").build()))
                .build();
    }

    private BulkTokenizeRequest buildBulkTokenizeRequest(String valueName) {
        TokenizeRequestData tokenizeRequestData = TokenizeRequestData.builder()
                .reference("0")
                .values(List.of(Values.builder()
                        .name(valueName)
                        .value("5178111111111111")
                        .build()))
                .build();
        TokenizeRequestData tokenizeRequestData2 = TokenizeRequestData.builder()
                .reference("1")
                .values(List.of(Values.builder()
                        .name(valueName)
                        .value("6178111111111111")
                        .build()))
                .build();
        BulkTokenizeRequest bulkTokenizeRequest = BulkTokenizeRequest.builder()
                .reference("test123")
                .templateRef("test-template-ref")
                .batches(Arrays.asList(tokenizeRequestData, tokenizeRequestData2))
                .build();
        return bulkTokenizeRequest;
    }

    private BulkDeTokenizeRequest buildDeTokenizeBulkRequests(String valueName) {
        DeTokenizeRequestData detokenizeRequest1 = DeTokenizeRequestData.builder()
                .bfid("test-bluefin-id")
                .reference("test123")
                .values(Arrays.asList(Values.builder()
                        .value("5178133333311111")
                        .name(valueName)
                        .build()))
                .build();
        DeTokenizeRequestData deTokenizeRequest2 = DeTokenizeRequestData.builder()
                .bfid("test-bluefin-id2")
                .reference("test123")
                .values(Arrays.asList(Values.builder()
                        .value("6178133333311111")
                        .name(valueName)
                        .build()))
                .build();
        return BulkDeTokenizeRequest.builder()
                .reference("test123")
                .batches(Arrays.asList(detokenizeRequest1, deTokenizeRequest2))
                .build();
    }

    private BulkDeTokenizeResponse getBulkDeTokenizeResponse(String valueName) {
        DeTokenizeResponse detokenizeResponse = DeTokenizeResponse.builder()
                .reference("0")
                .values(Arrays.asList(Values.builder()
                        .value("5178111111111111")
                        .name(valueName)
                        .build()))
                .build();
        DeTokenizeResponse deTokenizeResponse2 = DeTokenizeResponse.builder()
                .reference("1")
                .values(Arrays.asList(Values.builder()
                        .value("6178111111111111")
                        .name(valueName)
                        .build()))
                .build();
        BulkDeTokenizeResponse bulkDetokenizeResponse = BulkDeTokenizeResponse.builder()
                .reference("test-reference")
                .messageId("test-message-id")
                .batches(Arrays.asList(detokenizeResponse, deTokenizeResponse2))
                .build();
        return bulkDetokenizeResponse;
    }

    private DeTokenizeResponse getDeTokenizeResponse(String valueName) {
        DeTokenizeResponse deTokenizeResponse = DeTokenizeResponse.builder()
                .messageId("test-message-id")
                .reference("test-reference")
                .values(Arrays.asList(Values.builder()
                        .value("5178111111111111")
                        .name(valueName)
                        .build()))
                .build();
        return deTokenizeResponse;
    }

    private DeTokenizeRequestData buildDeTokenizeRequest(String valueName) {
        return DeTokenizeRequestData.builder()
                .bfid("test-bluefin-id")
                .reference("test123")
                .values(Arrays.asList(Values.builder()
                        .value("5178133333311111")
                        .name(valueName)
                        .build()))
                .build();
    }

}
