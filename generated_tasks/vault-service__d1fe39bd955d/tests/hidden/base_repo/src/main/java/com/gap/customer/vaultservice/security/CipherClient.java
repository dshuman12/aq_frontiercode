package com.gap.customer.vaultservice.security;

import javax.crypto.BadPaddingException;
import javax.crypto.IllegalBlockSizeException;

import com.gap.customer.vaultservice.dto.DataTypeKeyDataResultDTO;

public interface CipherClient {


    byte[] getCipherText(String cleartext, DataTypeKeyDataResultDTO dataTypeKeyData) throws BadPaddingException,
            IllegalBlockSizeException;


    String getClearText(byte[] cipherText, DataTypeKeyDataResultDTO dataTypeKeyData) throws BadPaddingException,
            IllegalBlockSizeException;

}
