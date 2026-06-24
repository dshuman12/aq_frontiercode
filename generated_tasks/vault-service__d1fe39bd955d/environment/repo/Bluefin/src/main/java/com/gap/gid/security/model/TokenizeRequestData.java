package com.gap.gid.security.model;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Builder
@Getter
public class TokenizeRequestData {

    private String reference;
    private String templateRef;
    private List<Values> values;
}
