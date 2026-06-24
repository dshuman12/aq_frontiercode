package com.gap.gid.security.adapter.impl;

import com.gap.gid.security.dto.BluefinTokenDTO;
import com.gap.gid.security.client.BluefinClient;
import com.gap.gid.security.dto.DeTokenizeRequestDTO;
import com.gap.gid.security.exception.BluefinTimeoutException;
import com.gap.gid.security.model.TokenizeResponseData;
import com.gap.gid.security.exception.BluefinException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.springframework.test.context.junit.jupiter.SpringExtension;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(SpringExtension.class)
class BluefinAdapterImplTest {

    @Mock
    BluefinClient bluefinClient;

    @InjectMocks
    BluefinAdapterImpl bluefinAdapter;

    @Test
    void shouldReturnBluefinTokenForGivenCreditCardNumber() throws BluefinException, BluefinTimeoutException {
        TokenizeResponseData tokenizeResponseData = TokenizeResponseData.builder()
                .bluefinToken("5178111111111114")
                .bfid("test-bluefin-id")
                .build();
        when(bluefinClient.tokenize(anyString())).thenReturn(tokenizeResponseData);

        BluefinTokenDTO tokenDto = bluefinAdapter.tokenize("517844444411114");

        assertEquals("5178111111111114", tokenDto.getToken());
        assertEquals("test-bluefin-id", tokenDto.getBfid());
        assertNull(tokenDto.getFormat());
        assertEquals("517844444411114", tokenDto.getInputValue());
        verify(bluefinClient, times(1)).tokenize(anyString());
    }

    @Test
    void shouldThrowExceptionWhenRestClientThrowsException() throws BluefinException, BluefinTimeoutException {
        when(bluefinClient.tokenize(anyString()))
                .thenThrow(new BluefinException("Response from bluefin is null"));

        assertThrows(BluefinException.class, () -> {
            bluefinAdapter.tokenize("517844444411114");
        });
        verify(bluefinClient, times(1)).tokenize(anyString());
    }

    @Test
    void shouldReturnBulkBluefinTokensForGivenCreditCardNumbers() throws BluefinException, BluefinTimeoutException {
        List<TokenizeResponseData> bulkResponseData = getBulkTokenizeResponseData();
        when(bluefinClient.tokenize(anyList())).thenReturn(bulkResponseData);

        List<BluefinTokenDTO> tokenDtos = bluefinAdapter.tokenize(Arrays.asList("517844444411114", "617844444411114"));

        assertEquals(2, tokenDtos.size());
        assertEquals("5178111111111114", tokenDtos.get(0).getToken());
        assertEquals("test-bluefin-id", tokenDtos.get(0).getBfid());
        assertEquals("6178111111111114", tokenDtos.get(1).getToken());
        assertEquals("test-bluefin-id2", tokenDtos.get(1).getBfid());
        verify(bluefinClient, times(1)).tokenize(anyList());
    }

    @Test
    void shouldThrowExceptionWhenBluefinClientBulkTokenizeThrowsException() throws BluefinException, BluefinTimeoutException {
        when(bluefinClient.tokenize(anyList()))
                .thenThrow(new BluefinException("Response from bluefin is null"));

        assertThrows(BluefinException.class, () -> {
            bluefinAdapter.tokenize(Arrays.asList("517844444411114"));
        });
        verify(bluefinClient, times(1)).tokenize(anyList());
    }

    @Test
    void shouldReturnPlainTextForGivenToken() throws BluefinException, BluefinTimeoutException {
        when(bluefinClient.deTokenize(any(DeTokenizeRequestDTO.class))).thenReturn("5178111111111114");

        String plainText = bluefinAdapter.deTokenize(getDeTokenizeRequest());

        assertEquals("5178111111111114", plainText);
        verify(bluefinClient, times(1)).deTokenize(any(DeTokenizeRequestDTO.class));
    }

    @Test
    void shouldThrowExceptionWhenBluefinClientDetokenizeThrowsException() throws BluefinException, BluefinTimeoutException {
        when(bluefinClient.deTokenize(any(DeTokenizeRequestDTO.class)))
                .thenThrow(new BluefinException("Response from bluefin is null"));

        assertThrows(BluefinException.class, () -> {
            bluefinAdapter.deTokenize(getDeTokenizeRequest());
        });
        verify(bluefinClient, times(1)).deTokenize(any(DeTokenizeRequestDTO.class));
    }

    @Test
    void shouldReturnPlainTextsForGivenTokens() throws BluefinException, BluefinTimeoutException {
        when(bluefinClient.deTokenize(anyList()))
                .thenReturn(Arrays.asList("5178111111111114", "6178111346111114"));

        List<String> response = bluefinAdapter.deTokenize(getDeTokenizeBulkRequests());

        assertEquals(2, response.size());
        assertEquals("5178111111111114", response.get(0));
        assertEquals("6178111346111114", response.get(1));
        verify(bluefinClient, times(1)).deTokenize(anyList());
    }

    @Test
    void shouldThrowExceptionWhenBluefinClientBulkdeTokenizeThrowsException() throws BluefinException, BluefinTimeoutException {
        when(bluefinClient.deTokenize(anyList()))
                .thenThrow(new BluefinException("Response from bluefin is null"));

        assertThrows(BluefinException.class, () -> {
            bluefinAdapter.deTokenize(getDeTokenizeBulkRequests());
        });
        verify(bluefinClient, times(1)).deTokenize(anyList());
    }

    private List<TokenizeResponseData> getBulkTokenizeResponseData() {
        TokenizeResponseData tokenizeResponseData = TokenizeResponseData.builder()
                .referenceId("0")
                .bluefinToken("5178111111111114")
                .bfid("test-bluefin-id")
                .build();
        TokenizeResponseData tokenizeResponseData2 = TokenizeResponseData.builder()
                .referenceId("1")
                .bluefinToken("6178111111111114")
                .bfid("test-bluefin-id2")
                .build();

        List<TokenizeResponseData> responseData = new ArrayList<>();
        responseData.add(tokenizeResponseData);
        responseData.add(tokenizeResponseData2);
        return responseData;
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
}
