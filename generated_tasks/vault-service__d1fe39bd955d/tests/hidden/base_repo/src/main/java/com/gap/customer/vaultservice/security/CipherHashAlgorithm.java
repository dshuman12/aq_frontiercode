package com.gap.customer.vaultservice.security;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Base64;

@Component
@RequiredArgsConstructor
@Slf4j
// CodeReview2: initialize hashAlgorithMap here rather than CipherKeys
public class CipherHashAlgorithm {


    private final CipherKeys cipherKeys;

    private MessageDigest getMessageDigest(String dataType) {
        MessageDigest messageDigest = null;
        String digestAlgorithm = null;
        try {
            digestAlgorithm = cipherKeys.getDataTypeDigestMap().get(dataType);
            messageDigest = MessageDigest.getInstance(digestAlgorithm);
        } catch (NoSuchAlgorithmException nsae) {
           log.error("[VOLT0106] - Error occurred when attempting to create a MessageDigest: algorithm="
                    + digestAlgorithm, nsae);
        }
        return messageDigest;
    }


    public String getHashValue(String data, String dataType) {
        MessageDigest messageDigest = getMessageDigest(dataType);
        messageDigest.reset();
        messageDigest.update(data.getBytes());
        byte[] hashBytes = messageDigest.digest();
        return Base64.getEncoder().encodeToString(hashBytes);
    }

}
