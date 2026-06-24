package com.gap.gid.security.model;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Builder
@Getter
public class BulkTokenizeRequest {

    private String reference;
    private String templateRef;
    private List<TokenizeRequestData> batches;
}
