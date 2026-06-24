package com.gap.customer.vaultservice.services.Impl;

import com.gap.customer.vaultservice.dto.DataTypeKeyDataResultDTO;
import com.gap.customer.vaultservice.exception.CipherClientException;
import com.gap.customer.vaultservice.security.CipherClientImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.springframework.test.context.junit.jupiter.SpringExtension;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(SpringExtension.class)
class CipherClientAdapterTest {

    @Mock
    private CipherClientImpl cipherClient;

    @InjectMocks
    private CipherClientAdapter cipherClientAdapter;

    @Test
    public void shouldReturnClearTextWhenCipherClientReturnsClearText() throws CipherClientException {
        when(cipherClient.getClearText(any(), any(DataTypeKeyDataResultDTO.class))).thenReturn("Password@test");

        String actualResult = cipherClientAdapter.getDecryptedText("Password@test".getBytes(), getDataTypeKeyDataResultDTO());
        String expectedResult = "Password@test";

        assertEquals(expectedResult, actualResult);
    }

    @Test
    public void shouldThrowExceptionWhenCipherClientReturnsNull() throws CipherClientException {
        when(cipherClient.getClearText(any(), any(DataTypeKeyDataResultDTO.class))).thenReturn(null);

        assertThrows(CipherClientException.class, () -> cipherClientAdapter.getDecryptedText("Password@test".getBytes(), getDataTypeKeyDataResultDTO()));
    }

    @Test
    public void shouldReturnCipherTextWhenCipherClientReturnsCipherText() throws CipherClientException {
        String clearText = "sampleText123";
        byte[] cipherText = clearText.getBytes();
        when(cipherClient.getCipherText(any(), any(DataTypeKeyDataResultDTO.class))).thenReturn(cipherText);

        byte[] actualResult = cipherClientAdapter.getEncryptedText(clearText, getDataTypeKeyDataResultDTO());

        assertEquals(cipherText, actualResult);
    }

    @Test
    public void shouldThrowExceptionWhenCipherClientReturnsNullForCipherText() throws CipherClientException {
        when(cipherClient.getCipherText(any(), any(DataTypeKeyDataResultDTO.class))).thenReturn(null);

        assertThrows(CipherClientException.class, () ->
                cipherClientAdapter.getEncryptedText("sampleText123", getDataTypeKeyDataResultDTO())
        );
    }

    private DataTypeKeyDataResultDTO getDataTypeKeyDataResultDTO() {
        return DataTypeKeyDataResultDTO.builder()
                .build();
    }
}