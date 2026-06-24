package com.gap.gid.security.client.hmac;

import org.apache.commons.codec.digest.DigestUtils;
import org.apache.commons.codec.digest.HmacAlgorithms;
import org.apache.commons.codec.digest.HmacUtils;

import java.util.UUID;

public class HmacUtil {

    public static String makeSha256Hash(String data) {
        return DigestUtils.sha256Hex(data);
    }

    /**
     * creates the Hmac SHA256 of payload to be send as part of Hmac Auth header
     */
    public static String generateResponseHmac(HmacDataContainer hmacDataContainer, String sharedKey) {
        var hmacResponse = new StringBuilder();
        hmacResponse.append(hmacDataContainer.getHttpVerb()).append(" ")
                .append(hmacDataContainer.getCanonicalizedResource()).append("\n")
                .append(hmacDataContainer.getNonce()).append("\n")
                .append(hmacDataContainer.getTimestamp()).append("\n\n")
                .append(hmacDataContainer.getContentHash());

        return makeHmacSha256Hash(sharedKey, hmacResponse.toString());
    }

    public static String hmacAuthHeader(String username, String nonce, long timeStamp, String hmacSHA256Hash) {
        return new StringBuilder().append("hmac ")
                .append("username=").append(username).append(",").append(" ")
                .append("nonce=").append(nonce).append(",").append(" ")
                .append("timestamp=").append(timeStamp).append(",").append(" ")
                .append("response=").append(hmacSHA256Hash).toString();
    }

    /**
     * Convert string data to HMAC SHA256
     */
    private static String makeHmacSha256Hash(String key, String data) {
        return new HmacUtils(HmacAlgorithms.HMAC_SHA_256, key.getBytes()).hmacHex(data);
    }

    /**
     * Return 128 bit nonce
     */
    public static String getNonce() {
        return UUID.randomUUID().toString().replace("-", "");
    }

    /**
     * Returns epoch timestamp in seconds
     */
    public static long getTimestamp() {
        return System.currentTimeMillis() / 1000L;
    }

}
