package com.gap.customer.vaultservice.services.Impl;

import com.gap.customer.vaultservice.dto.DataTypeKeyDataResultDTO;
import com.gap.customer.vaultservice.exception.CipherClientException;
import com.gap.customer.vaultservice.exception.VaultServiceException;
import com.gap.customer.vaultservice.security.CipherClientImpl;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;


@RequiredArgsConstructor
@Component
public class CipherClientAdapter {

    private final CipherClientImpl cipherClient;

    public byte[] getEncryptedText(String cleartext, DataTypeKeyDataResultDTO dataTypeKeyData) throws CipherClientException {

        byte[] cipherText = cipherClient.getCipherText(cleartext, dataTypeKeyData);
        if (cipherText == null) {
            throw new CipherClientException("Cipher cannot Encrypt for the clear text");
        }
        return cipherText;
    }


    public String getDecryptedText(byte[] cipherText, DataTypeKeyDataResultDTO dataTypeKeyData) throws CipherClientException {

        String clearText = cipherClient.getClearText(cipherText, dataTypeKeyData);
        if (clearText == null) {
            throw new CipherClientException("Cipher cannot decrypt for the cipher text");
        }
        return clearText;
    }
}
