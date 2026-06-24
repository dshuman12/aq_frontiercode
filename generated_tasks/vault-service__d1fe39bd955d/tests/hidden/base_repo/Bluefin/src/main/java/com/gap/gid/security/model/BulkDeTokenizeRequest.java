package com.gap.gid.security.model;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Builder
@Getter
public class BulkDeTokenizeRequest {

    private String reference;
    private List<DeTokenizeRequestData> batches;
}
