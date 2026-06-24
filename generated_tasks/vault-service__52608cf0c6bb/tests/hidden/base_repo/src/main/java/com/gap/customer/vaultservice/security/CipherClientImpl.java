package com.gap.customer.vaultservice.security;


import com.gap.customer.vaultservice.dto.DataTypeKeyDataResultDTO;


import com.gap.customer.vaultservice.exception.CipherClientException;
import com.ingrian.security.nae.NAEException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;


import javax.crypto.BadPaddingException;
import javax.crypto.Cipher;
import javax.crypto.IllegalBlockSizeException;
import javax.crypto.spec.IvParameterSpec;
import java.security.Key;


/**
 * Manage a set of Ciphers for Encryption and Decryption, for a set of data types.
 *
 * @version - 2.0
 */


@Slf4j
@RequiredArgsConstructor
@Component
public class CipherClientImpl {

    private final CipherKeys cipherKeys;
    private final static int CIPHER_TIMEOUT = 20;

    /**
     * Get the current Cipher to use for encrypting the given DataType
     *
     * @param dataTypeKeyData - the type of data to be encrypted
     * @return - a Cipher initialized and ready for encrypting data
     */

    private Cipher getEncryptionCipher(DataTypeKeyDataResultDTO dataTypeKeyData) {
        return getCipher(Cipher.ENCRYPT_MODE, dataTypeKeyData);
    }

    /**
     * Get the current Cipher to use for decrypting the given DataType
     *
     * @param dataTypeKeyData - the stringified Object ID of the KeyData
     * @return - a Cipher initialized and ready for decrypting data
     */

    private Cipher getDecryptionCipher(DataTypeKeyDataResultDTO dataTypeKeyData) {
        return getCipher(Cipher.DECRYPT_MODE, dataTypeKeyData);
    }

    /**
     * Create a cipher instance appropriate to the given data type
     */

    private Cipher getCipher(int encryptionMode, DataTypeKeyDataResultDTO dataTypeKeyData) {
        Long startTime = System.currentTimeMillis();
        final String methodSignature = "Cipher getCipher(int,DataTypeKeyData): ";
        Cipher cipher = null;
        String keyData = null;
        Key key = null;

        try {
            keyData = dataTypeKeyData.getEktKeyNm(); // retrieve the keydata from the cache
            cipher = Cipher.getInstance(dataTypeKeyData.getEktKeyAlgrTxt(), dataTypeKeyData.getEktKeyPvdrNm());
            key = cipherKeys.getKey(keyData);

            // KeyData.getInitializationVector is null
            cipher.init(encryptionMode, key, new IvParameterSpec(dataTypeKeyData.getInitializationVector()));
        } catch (Exception e) {
            log.error("[VOLT0105] - Error occurred when attempting to create a Cipher: algorithm="
                    + dataTypeKeyData.getEktKeyAlgrTxt() + " keyName=" + keyData, e);
        }
        finally{
            Long endTime = System.currentTimeMillis();
            Long totalTime = endTime - startTime;
            if (totalTime > CIPHER_TIMEOUT) {
                log.info("Time taken for getCipher : " + totalTime + " with thread id: "
                        + Thread.currentThread().getId() +" with encryptionMode: "+encryptionMode);
            }

        }
        return cipher;
    }

    /**
     * Encrypt the given cleartext, using the encryption algorithm configured for the given datatype
     *
     * @param cleartext       - the string to encrypt
     * @param datatypeKeyData - the type of data contained in the cleartext
     * @return - an encrypted form of the given data
     */

    public byte[] getCipherText(String cleartext, DataTypeKeyDataResultDTO datatypeKeyData) throws CipherClientException {
        Long startTime = System.currentTimeMillis();
        try {
            Cipher encryptionCipher = getEncryptionCipher(datatypeKeyData);
            return encryptionCipher.doFinal(cleartext.getBytes());
        } catch (BadPaddingException | IllegalBlockSizeException | NAEException exception) {
            log.error("CipherClient:: Error occurred while encrypting the clear text", exception);
            throw new CipherClientException("Error occurred while encrypting the cleartext");
        } finally {
            Long endTime = System.currentTimeMillis();
            Long totalTime = endTime - startTime;
            if (totalTime > CIPHER_TIMEOUT) {
                log.info("Time taken for getCipherText : " + totalTime + " with thread id: " + Thread.currentThread().getId());
            }
        }
    }

    /**
     * Decrypt the given cleartext, using the encryption algorithm configured for the given datatype
     *
     * @param ciphertext      - the string to decrypt
     * @param datatypeKeyData - the type of data contained in the ciphertext
     * @return - a decrypted form of the given data
     */

    public String getClearText(byte[] ciphertext, DataTypeKeyDataResultDTO datatypeKeyData) throws CipherClientException {
        Long startTime = System.currentTimeMillis();
        try {
            Cipher decryptionCipher = getDecryptionCipher(datatypeKeyData);
            return new String(decryptionCipher.doFinal(ciphertext));
        } catch (BadPaddingException | IllegalBlockSizeException | NAEException exception) {
            log.error("CipherClient:: Error occurred while decrypting the cipher text ", exception);
            throw new CipherClientException("Error occurred while decrypting the cleartext");
        }
        finally {
            Long endTime = System.currentTimeMillis();
            Long totalTime = endTime - startTime;
            if (totalTime > CIPHER_TIMEOUT) {
                log.info("Time taken for getClearText : " + totalTime + " with thread id: " + Thread.currentThread().getId());
            }
        }
    }

}

