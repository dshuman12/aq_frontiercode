package com.gap.gid.security.client.hmac;

import lombok.Builder;
import lombok.Getter;
import lombok.ToString;

@Builder
@Getter
@ToString
public class HmacDataContainer {

    private String httpVerb;
    private String canonicalizedResource;
    private String nonce;
    private long timestamp;
    private String contentHash;
}
