package com.gap.gid.security.dto;

import lombok.Builder;
import lombok.Getter;

@Builder
@Getter
public class DeTokenizeRequestDTO {

    private String bfid;
    private String token;
}