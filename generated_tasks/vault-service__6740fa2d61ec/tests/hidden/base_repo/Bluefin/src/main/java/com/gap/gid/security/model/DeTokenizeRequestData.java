package com.gap.gid.security.model;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Builder
@Getter
public class DeTokenizeRequestData {

    private String reference;
    private String bfid;
    private List<Values> values;
}
