package com.gap.gid.security.model;


import lombok.Builder;
import lombok.Getter;

@Builder
@Getter
public class TokenizeResponseData {

    private String bfid;
    private String bluefinToken;
    private String referenceId;
}
