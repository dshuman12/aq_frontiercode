package com.gap.gid.security.dto;

import lombok.Builder;
import lombok.Getter;

@Builder
@Getter
public class BluefinTokenDTO {

    private String token;
    private String format;
    private String inputValue;
    private String bfid;
}