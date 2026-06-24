package com.gap.gid.security.client;

import com.gap.gid.security.dto.BluefinPropertiesDTO;
import com.gap.gid.security.dto.DeTokenizeRequestDTO;
import com.gap.gid.security.exception.BluefinException;
import com.gap.gid.security.exception.BluefinTimeoutException;
import com.gap.gid.security.model.BulkDeTokenizeRequest;
import com.gap.gid.security.model.BulkDeTokenizeResponse;
import com.gap.gid.security.model.BulkTokenizeRequest;
import com.gap.gid.security.model.BulkTokenizeResponse;
import com.gap.gid.security.model.DeTokenizeRequestData;
import com.gap.gid.security.model.DeTokenizeResponse;
import com.gap.gid.security.model.TokenizeRequestData;
import com.gap.gid.security.model.TokenizeResponse;
import com.gap.gid.security.model.TokenizeResponseData;
import com.gap.gid.security.model.Values;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(SpringExtension.class)
class BluefinRestClientTest {

    @Mock
    private BluefinPropertiesDTO bluefinPropertiesDTO;

    @Mock
    ResilientBluefinRestClient resilientBluefinRestClient;

    @InjectMocks
    private BluefinRestClient bluefinClient;

    @BeforeEach
    void setUp() {
        when(bluefinPropertiesDTO.getHost()).thenReturn("https://test-host");
        when(bluefinPropertiesDTO.getTokenizePath()).thenReturn("/api/tokenization/tokenize");
        when(bluefinPropertiesDTO.getBulkTokenizePath()).thenReturn("/api/tokenization/batch/tokenize");
        when(bluefinPropertiesDTO.getDeTokenizePath()).thenReturn("/api/tokenization/detokenize");
        when(bluefinPropertiesDTO.getBulkDeTokenizePath()).thenReturn("/api/tokenization/batch/detokenize");
        when(bluefinPropertiesDTO.getPartnerId()).thenReturn("test-partner-id");
        when(bluefinPropertiesDTO.getPartnerKey()).thenReturn("test-partner-key");
    }

    @Test
    void shouldReturnBluefinTokenForGivenCreditCardNumber() throws BluefinException, BluefinTimeoutException {
        TokenizeResponse tokenizeResponse = getTokenizeResponse();
        when(resilientBluefinRestClient.tokenize(any(TokenizeRequestData.class)))
                .thenReturn(new ResponseEntity<>(tokenizeResponse, HttpStatus.OK));

        TokenizeResponseData tokenizeResponseData = bluefinClient.tokenize("5178111111111111");

        assertEquals("5178133333311111", tokenizeResponseData.getBluefinToken());
        assertEquals("test-blufin-id", tokenizeResponseData.getBfid());
    }

    @Test
    void shouldThrowBluefinExceptionWhenTokenizeResponseIsNull() throws BluefinException {
        when(resilientBluefinRestClient.tokenize(any(TokenizeRequestData.class)))
                .thenReturn(new ResponseEntity<>(null, HttpStatus.OK));

        assertThrows(BluefinException.class, () -> {
            bluefinClient.tokenize("5178111111111111");
        });
    }

    @Test
    void shouldThrowBluefinExceptionWhenBluefinResponseIsConflict() throws BluefinException {
        when(resilientBluefinRestClient.tokenize(any(TokenizeRequestData.class)))
                .thenThrow(new HttpClientErrorException(HttpStatus.CONFLICT));

        assertThrows(BluefinException.class, () -> {
            bluefinClient.tokenize("517811111111111A");
        });
    }

    @Test
    void shouldThrowBluefinExceptionWhenBluefinThrowsServerErrorException() throws BluefinException {
        when(resilientBluefinRestClient.tokenize(any(TokenizeRequestData.class)))
                .thenThrow(new HttpServerErrorException(HttpStatus.INTERNAL_SERVER_ERROR));

        assertThrows(BluefinException.class, () -> {
            bluefinClient.tokenize("517811111111111A");
        });
    }

    @Test
    void shouldReturnBulkBluefinTokensForGivenCreditCardNumbers() throws BluefinException, BluefinTimeoutException {
        BulkTokenizeResponse bulkTokenizeResponse = getBulkTokenizeResponse();
        when(resilientBluefinRestClient.bulkTokenize(any(BulkTokenizeRequest.class)))
                .thenReturn(new ResponseEntity<>(bulkTokenizeResponse, HttpStatus.OK));

        List<TokenizeResponseData> tokenizeResponseData = bluefinClient.tokenize(Arrays.asList("5178111111111111", "6178111111111111"));

        assertEquals(2, tokenizeResponseData.size());
        assertEquals("5178133333311111", tokenizeResponseData.get(0).getBluefinToken());
        assertEquals("0", tokenizeResponseData.get(0).getReferenceId());
        assertEquals("6178133333311111", tokenizeResponseData.get(1).getBluefinToken());
        assertEquals("1", tokenizeResponseData.get(1).getReferenceId());
    }

    @Test
    void shouldReturnBulkBluefinTokensForGivenCreditCardNumbersInSortedOrder() throws BluefinException, BluefinTimeoutException {
        BulkTokenizeResponse bulkTokenizeResponse = getBulkTokenizeResponseInRandomOrder();
        when(resilientBluefinRestClient.bulkTokenize(any(BulkTokenizeRequest.class)))
                .thenReturn(new ResponseEntity<>(bulkTokenizeResponse, HttpStatus.OK));

        List<TokenizeResponseData> tokenizeResponseData = bluefinClient.tokenize(Arrays.asList("5178111111111111", "6178111111111111"));

        assertEquals(2, tokenizeResponseData.size());
        assertEquals("6178133333311111", tokenizeResponseData.get(0).getBluefinToken());
        assertEquals("0", tokenizeResponseData.get(0).getReferenceId());
        assertEquals("5178133333311111", tokenizeResponseData.get(1).getBluefinToken());
        assertEquals("1", tokenizeResponseData.get(1).getReferenceId());
    }

    @Test
    void shouldThrowBluefinExceptionWhenBulkTokenizeResponseIsNull() throws BluefinException {
        when(resilientBluefinRestClient.bulkTokenize(any(BulkTokenizeRequest.class)))
                .thenReturn(new ResponseEntity<>(null, HttpStatus.OK));

        assertThrows(BluefinException.class, () -> {
            bluefinClient.tokenize(Arrays.asList("5178111111111111", "6178111111111111"));
        });
    }

    @Test
    void shouldThrowBluefinExceptionWhenBulkTokenizeResponseIsConflict() throws BluefinException {
        when(resilientBluefinRestClient.bulkTokenize(any(BulkTokenizeRequest.class)))
                .thenThrow(new HttpClientErrorException(HttpStatus.CONFLICT));

        assertThrows(BluefinException.class, () -> {
            bluefinClient.tokenize(Arrays.asList("51781111111111BA", "6178111111111111"));
        });
    }

    @Test
    void shouldThrowBluefinExceptionWhenBulkTokenizeThrowsInternalServerError() throws BluefinException {
        when(resilientBluefinRestClient.bulkTokenize(any(BulkTokenizeRequest.class)))
                .thenThrow(new HttpClientErrorException(HttpStatus.INTERNAL_SERVER_ERROR));

        assertThrows(BluefinException.class, () -> {
            bluefinClient.tokenize(Arrays.asList("51781111111111BA", "6178111111111111"));
        });
    }

    @Test
    void shouldReturnPlainTextForGivenToken() throws BluefinException, BluefinTimeoutException {
        DeTokenizeResponse detokenizeResponse = getDeTokenizeResponse();
        when(resilientBluefinRestClient.deTokenize(any(DeTokenizeRequestData.class)))
                .thenReturn(new ResponseEntity<>(detokenizeResponse, HttpStatus.OK));

        String plainText = bluefinClient.deTokenize(getDeTokenizeRequest());

        assertEquals("5178111111111111", plainText);
    }

    @Test
    void shouldThrowBluefinExceptionWhenDetokenizeResponseIsNull() throws BluefinException {
        when(resilientBluefinRestClient.deTokenize(any(DeTokenizeRequestData.class)))
                .thenReturn(new ResponseEntity<>(null, HttpStatus.OK));

        assertThrows(BluefinException.class, () -> {
            bluefinClient.deTokenize(getDeTokenizeRequest());
        });
    }

    @Test
    void shouldThrowBluefinExceptionWhenBluefinDetokenizeResponseIsConfict() throws BluefinException {
        when(resilientBluefinRestClient.deTokenize(any(DeTokenizeRequestData.class)))
                .thenThrow(new HttpClientErrorException(HttpStatus.CONFLICT));

        assertThrows(BluefinException.class, () -> {
            bluefinClient.deTokenize(getDeTokenizeRequest());
        });
    }

    @Test
    void shouldThrowBluefinExceptionWhenDetokenizeResponseThrowsInternalServerError() throws BluefinException {
        when(resilientBluefinRestClient.deTokenize(any(DeTokenizeRequestData.class)))
                .thenThrow(new HttpServerErrorException(HttpStatus.INTERNAL_SERVER_ERROR));

        assertThrows(BluefinException.class, () -> {
            bluefinClient.deTokenize(getDeTokenizeRequest());
        });
    }

    @Test
    void shouldReturnPlainTextsForGivenTokens() throws BluefinException, BluefinTimeoutException {
        BulkDeTokenizeResponse bulkDeTokenizeResponse = getBulkDeTokenizeResponse();
        when(resilientBluefinRestClient.bulkDetokenize(any(BulkDeTokenizeRequest.class)))
                .thenReturn(new ResponseEntity<>(bulkDeTokenizeResponse, HttpStatus.OK));

        List<String> response = bluefinClient.deTokenize(getDeTokenizeBulkRequests());

        assertEquals(2, response.size());
        assertEquals("5178111111111111", response.get(0));
        assertEquals("6178111111111111", response.get(1));
    }

    @Test
    void shouldReturnPlainTextsForGivenTokensInSortedOrder() throws BluefinException, BluefinTimeoutException {
        BulkDeTokenizeResponse bulkDeTokenizeResponse = getBulkDeTokenizeResponseInRandomOrder();
        when(resilientBluefinRestClient.bulkDetokenize(any(BulkDeTokenizeRequest.class)))
                .thenReturn(new ResponseEntity<>(bulkDeTokenizeResponse, HttpStatus.OK));

        List<String> response = bluefinClient.deTokenize(getDeTokenizeBulkRequests());

        assertEquals(2, response.size());
        assertEquals("6178111111111111", response.get(0));
        assertEquals("5178111111111111", response.get(1));
    }

    @Test
    void shouldThrowBluefinExceptionWhenBulkDetokenizeResponseIsNull() throws BluefinException {
        when(resilientBluefinRestClient.bulkDetokenize(any(BulkDeTokenizeRequest.class)))
                .thenReturn(new ResponseEntity<>(null, HttpStatus.OK));

        assertThrows(BluefinException.class, () -> {
            bluefinClient.deTokenize(getDeTokenizeBulkRequests());
        });
    }

    @Test
    void shouldThrowBluefinExceptionWhenBulkDetokenizeResponseIsConflict() throws BluefinException {
        when(resilientBluefinRestClient.bulkDetokenize(any(BulkDeTokenizeRequest.class)))
                .thenThrow(new HttpClientErrorException(HttpStatus.CONFLICT));

        assertThrows(BluefinException.class, () -> {
            bluefinClient.deTokenize(getDeTokenizeBulkRequests());
        });
    }

    @Test
    void shouldThrowBluefinExceptionWhenBulkDetokenizeThrowsInternalServerError() throws BluefinException {
        when(resilientBluefinRestClient.bulkDetokenize(any(BulkDeTokenizeRequest.class)))
                .thenThrow(new HttpServerErrorException(HttpStatus.INTERNAL_SERVER_ERROR));

        assertThrows(BluefinException.class, () -> {
            bluefinClient.deTokenize(getDeTokenizeBulkRequests());
        });
    }

    private TokenizeResponse getTokenizeResponse() {
        TokenizeResponse tokenizeResponse = TokenizeResponse.builder()
                .bfid("test-blufin-id")
                .messageId("test-message-id")
                .reference("test-reference")
                .values(Arrays.asList(Values.builder()
                        .value("5178133333311111")
                        .name("scx_token_card_number")
                        .build()))
                .build();
        return tokenizeResponse;
    }

    private DeTokenizeResponse getDeTokenizeResponse() {
        DeTokenizeResponse deTokenizeResponse = DeTokenizeResponse.builder()
                .messageId("test-message-id")
                .reference("test-reference")
                .values(Arrays.asList(Values.builder()
                        .value("5178111111111111")
                        .name("scx_token_card_number")
                        .build()))
                .build();
        return deTokenizeResponse;
    }

    private DeTokenizeRequestDTO getDeTokenizeRequest() {
        DeTokenizeRequestDTO deTokenizeRequestDto = DeTokenizeRequestDTO.builder()
                .bfid("test-bluefin-id")
                .token("5178133333311111")
                .build();
        return deTokenizeRequestDto;
    }

    private List<DeTokenizeRequestDTO> getDeTokenizeBulkRequests() {
        List<DeTokenizeRequestDTO> deTokenizeRequestDtos = new ArrayList<>();
        DeTokenizeRequestDTO deTokenizeRequestDto = DeTokenizeRequestDTO.builder()
                .bfid("test-bluefin-id")
                .token("5178133333311111")
                .build();
        DeTokenizeRequestDTO deTokenizeRequestDto2 = DeTokenizeRequestDTO.builder()
                .bfid("test-bluefin-id2")
                .token("6178133333311111")
                .build();
        deTokenizeRequestDtos.add(deTokenizeRequestDto);
        deTokenizeRequestDtos.add(deTokenizeRequestDto2);
        return deTokenizeRequestDtos;
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

    private BulkTokenizeResponse getBulkTokenizeResponseInRandomOrder() {
        TokenizeResponse tokenizeResponse = TokenizeResponse.builder()
                .bfid("test-blufin-id")
                .reference("1")
                .values(Arrays.asList(Values.builder()
                        .value("5178133333311111")
                        .name("scx_token_card_number")
                        .build()))
                .build();
        TokenizeResponse tokenizeResponse2 = TokenizeResponse.builder()
                .bfid("test-blufin-id")
                .reference("0")
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

    private BulkDeTokenizeResponse getBulkDeTokenizeResponseInRandomOrder() {
        DeTokenizeResponse detokenizeResponse = DeTokenizeResponse.builder()
                .reference("1")
                .values(Arrays.asList(Values.builder()
                        .value("5178111111111111")
                        .name("scx_token_card_number")
                        .build()))
                .build();
        DeTokenizeResponse deTokenizeResponse2 = DeTokenizeResponse.builder()
                .reference("0")
                .values(Arrays.asList(Values.builder()
                        .value("6178111111111111")
                        .name("scx_token_card_number")
                        .build()))
                .build();
        BulkDeTokenizeResponse bulkDetokenizeResponse = BulkDeTokenizeResponse.builder()
                .reference("test-reference")
                .messageId("test-message-id")
                .batches(Arrays.asList(detokenizeResponse, deTokenizeResponse2))
                .build();
        return bulkDetokenizeResponse;
    }

    private BulkDeTokenizeResponse getBulkDeTokenizeResponse() {
        DeTokenizeResponse detokenizeResponse = DeTokenizeResponse.builder()
                .reference("0")
                .values(Arrays.asList(Values.builder()
                        .value("5178111111111111")
                        .name("scx_token_card_number")
                        .build()))
                .build();
        DeTokenizeResponse deTokenizeResponse2 = DeTokenizeResponse.builder()
                .reference("1")
                .values(Arrays.asList(Values.builder()
                        .value("6178111111111111")
                        .name("scx_token_card_number")
                        .build()))
                .build();
        BulkDeTokenizeResponse bulkDetokenizeResponse = BulkDeTokenizeResponse.builder()
                .reference("test-reference")
                .messageId("test-message-id")
                .batches(Arrays.asList(detokenizeResponse, deTokenizeResponse2))
                .build();
        return bulkDetokenizeResponse;
    }
}
