package com.gap.gid.security.adapter.impl;

import com.gap.gid.security.client.BluefinClient;
import com.gap.gid.security.dto.BluefinTokenDTO;
import com.gap.gid.security.dto.DeTokenizeRequestDTO;
import com.gap.gid.security.exception.BluefinException;
import com.gap.gid.security.exception.BluefinTimeoutException;
import com.gap.gid.security.model.DataType;
import com.gap.gid.security.model.TokenizeResponseData;
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
        when(bluefinClient.tokenize(anyString(), any(DataType.class))).thenReturn(tokenizeResponseData);

        BluefinTokenDTO tokenDto = bluefinAdapter.tokenize("517844444411114", DataType.CreditCardNumber);

        assertEquals("5178111111111114", tokenDto.getToken());
        assertEquals("test-bluefin-id", tokenDto.getBfid());
        assertNull(tokenDto.getFormat());
        assertEquals("517844444411114", tokenDto.getInputValue());
        verify(bluefinClient, times(1)).tokenize(anyString(), any(DataType.class));
    }

    @Test
    void shouldReturnBluefinTokenForGivenGiftCardNumber() throws BluefinException, BluefinTimeoutException {
        TokenizeResponseData tokenizeResponseData = TokenizeResponseData.builder()
                .bluefinToken("5178111111111114")
                .bfid("test-bluefin-id")
                .build();
        when(bluefinClient.tokenize(anyString(), any())).thenReturn(tokenizeResponseData);

        BluefinTokenDTO tokenDto = bluefinAdapter.tokenize("517844444411114", DataType.GiftCardNumber);

        assertEquals("5178111111111114", tokenDto.getToken());
        assertEquals("test-bluefin-id", tokenDto.getBfid());
        assertNull(tokenDto.getFormat());
        assertEquals("517844444411114", tokenDto.getInputValue());
        verify(bluefinClient, times(1)).tokenize(anyString(), any(DataType.class));
    }

    @Test
    void shouldThrowExceptionWhenRestClientThrowsException() throws BluefinException, BluefinTimeoutException {
        when(bluefinClient.tokenize(anyString(), any(DataType.class)))
                .thenThrow(new BluefinException("Response from bluefin is null"));

        assertThrows(BluefinException.class, () -> {
            bluefinAdapter.tokenize("517844444411114", DataType.CreditCardNumber);
        });
        verify(bluefinClient, times(1)).tokenize(anyString(), any(DataType.class));
    }

    @Test
    void shouldThrowExceptionWhenRestClientThrowsExceptionForGiftCardNumber() throws BluefinException, BluefinTimeoutException {
        when(bluefinClient.tokenize(anyString(), any(DataType.class)))
                .thenThrow(new BluefinException("Response from bluefin is null"));

        assertThrows(BluefinException.class, () -> {
            bluefinAdapter.tokenize("517844444411114", DataType.GiftCardNumber);
        });
        verify(bluefinClient, times(1)).tokenize(anyString(), any(DataType.class));
    }

    @Test
    void shouldReturnBulkBluefinTokensForGivenCreditCardNumbers() throws BluefinException, BluefinTimeoutException {
        List<TokenizeResponseData> bulkResponseData = getBulkTokenizeResponseData();
        when(bluefinClient.tokenize(anyList(), any(DataType.class))).thenReturn(bulkResponseData);

        List<BluefinTokenDTO> tokenDtos = bluefinAdapter.tokenize(Arrays.asList("517844444411114", "617844444411114"), DataType.CreditCardNumber);

        assertEquals(2, tokenDtos.size());
        assertEquals("5178111111111114", tokenDtos.get(0).getToken());
        assertEquals("test-bluefin-id", tokenDtos.get(0).getBfid());
        assertEquals("6178111111111114", tokenDtos.get(1).getToken());
        assertEquals("test-bluefin-id2", tokenDtos.get(1).getBfid());
        verify(bluefinClient, times(1)).tokenize(anyList(), any(DataType.class));
    }

    @Test
    void shouldReturnBulkBluefinTokensForGivenGiftCardNumbers() throws BluefinException, BluefinTimeoutException {
        List<TokenizeResponseData> bulkResponseData = getBulkTokenizeResponseData();
        when(bluefinClient.tokenize(anyList(), any(DataType.class))).thenReturn(bulkResponseData);

        List<BluefinTokenDTO> tokenDtos = bluefinAdapter.tokenize(Arrays.asList("517844444411114", "617844444411114"), DataType.GiftCardNumber);

        assertEquals(2, tokenDtos.size());
        assertEquals("5178111111111114", tokenDtos.get(0).getToken());
        assertEquals("test-bluefin-id", tokenDtos.get(0).getBfid());
        assertEquals("6178111111111114", tokenDtos.get(1).getToken());
        assertEquals("test-bluefin-id2", tokenDtos.get(1).getBfid());
        verify(bluefinClient, times(1)).tokenize(anyList(), any(DataType.class));
    }

    @Test
    void shouldThrowExceptionWhenBluefinClientBulkTokenizeThrowsException() throws BluefinException, BluefinTimeoutException {
        when(bluefinClient.tokenize(anyList(), any(DataType.class)))
                .thenThrow(new BluefinException("Response from bluefin is null"));

        assertThrows(BluefinException.class, () -> {
            bluefinAdapter.tokenize(Arrays.asList("517844444411114"), DataType.CreditCardNumber);
        });
        verify(bluefinClient, times(1)).tokenize(anyList(), any(DataType.class));
    }

    @Test
    void shouldThrowExceptionWhenBluefinClientBulkTokenizeThrowsExceptionForGiftCardNumber() throws BluefinException, BluefinTimeoutException {
        when(bluefinClient.tokenize(anyList(), any(DataType.class)))
                .thenThrow(new BluefinException("Response from bluefin is null"));

        assertThrows(BluefinException.class, () -> {
            bluefinAdapter.tokenize(Arrays.asList("517844444411114"), DataType.GiftCardNumber);
        });
        verify(bluefinClient, times(1)).tokenize(anyList(), any(DataType.class));
    }

    @Test
    void shouldReturnPlainTextForGivenToken() throws BluefinException, BluefinTimeoutException {
        when(bluefinClient.deTokenize(any(DeTokenizeRequestDTO.class), any(DataType.class))).thenReturn("5178111111111114");

        String plainText = bluefinAdapter.deTokenize(getDeTokenizeRequest(), DataType.CreditCardNumber);

        assertEquals("5178111111111114", plainText);
        verify(bluefinClient, times(1)).deTokenize(any(DeTokenizeRequestDTO.class), any(DataType.class));
    }

    @Test
    void shouldReturnPlainTextForGivenTokenWithDataType() throws BluefinException, BluefinTimeoutException {
        when(bluefinClient.deTokenize(any(DeTokenizeRequestDTO.class), any(DataType.class))).thenReturn("5178111111111114");

        String plainText = bluefinAdapter.deTokenize(getDeTokenizeRequest(), DataType.GiftCardNumber);

        assertEquals("5178111111111114", plainText);
        verify(bluefinClient, times(1)).deTokenize(any(DeTokenizeRequestDTO.class), any(DataType.class));
    }

    @Test
    void shouldThrowExceptionWhenBluefinClientDetokenizeThrowsException() throws BluefinException, BluefinTimeoutException {
        when(bluefinClient.deTokenize(any(DeTokenizeRequestDTO.class), any(DataType.class)))
                .thenThrow(new BluefinException("Response from bluefin is null"));

        assertThrows(BluefinException.class, () -> {
            bluefinAdapter.deTokenize(getDeTokenizeRequest(), DataType.CreditCardNumber);
        });
        verify(bluefinClient, times(1)).deTokenize(any(DeTokenizeRequestDTO.class), any(DataType.class));
    }

    @Test
    void shouldThrowExceptionWhenBluefinClientDetokenizeThrowsExceptionWithDataType() throws BluefinException, BluefinTimeoutException {
        when(bluefinClient.deTokenize(any(DeTokenizeRequestDTO.class), any(DataType.class)))
                .thenThrow(new BluefinException("Response from bluefin is null"));

        assertThrows(BluefinException.class, () -> {
            bluefinAdapter.deTokenize(getDeTokenizeRequest(), DataType.GiftCardNumber);
        });
        verify(bluefinClient, times(1)).deTokenize(any(DeTokenizeRequestDTO.class), any(DataType.class));
    }

    @Test
    void shouldReturnPlainTextsForGivenTokens() throws BluefinException, BluefinTimeoutException {
        when(bluefinClient.deTokenize(anyList(), any(DataType.class)))
                .thenReturn(Arrays.asList("5178111111111114", "6178111346111114"));

        List<String> response = bluefinAdapter.deTokenize(getDeTokenizeBulkRequests(), DataType.CreditCardNumber);

        assertEquals(2, response.size());
        assertEquals("5178111111111114", response.get(0));
        assertEquals("6178111346111114", response.get(1));
        verify(bluefinClient, times(1)).deTokenize(anyList(), any(DataType.class));
    }


    @Test
    void shouldReturnPlainTextsForGivenTokensOfGiftCardNumbers() throws BluefinException, BluefinTimeoutException {
        when(bluefinClient.deTokenize(anyList(), any(DataType.class)))
                .thenReturn(Arrays.asList("5178111111111114", "6178111346111114"));

        List<String> response = bluefinAdapter.deTokenize(getDeTokenizeBulkRequests(), DataType.GiftCardNumber);

        assertEquals(2, response.size());
        assertEquals("5178111111111114", response.get(0));
        assertEquals("6178111346111114", response.get(1));
        verify(bluefinClient, times(1)).deTokenize(anyList(), any(DataType.class));
    }

    @Test
    void shouldThrowExceptionWhenBluefinClientBulkdeTokenizeThrowsException() throws BluefinException, BluefinTimeoutException {
        when(bluefinClient.deTokenize(anyList(), any(DataType.class)))
                .thenThrow(new BluefinException("Response from bluefin is null"));

        assertThrows(BluefinException.class, () -> {
            bluefinAdapter.deTokenize(getDeTokenizeBulkRequests(), DataType.CreditCardNumber);
        });
        verify(bluefinClient, times(1)).deTokenize(anyList(), any(DataType.class));
    }


    @Test
    void shouldThrowExceptionWhenBluefinClientBulkdeTokenizeThrowsExceptionWithDataType() throws BluefinException, BluefinTimeoutException {
        when(bluefinClient.deTokenize(anyList(), any(DataType.class)))
                .thenThrow(new BluefinException("Response from bluefin is null"));

        assertThrows(BluefinException.class, () -> {
            bluefinAdapter.deTokenize(getDeTokenizeBulkRequests(), DataType.GiftCardNumber);
        });
        verify(bluefinClient, times(1)).deTokenize(anyList(), any(DataType.class));
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
