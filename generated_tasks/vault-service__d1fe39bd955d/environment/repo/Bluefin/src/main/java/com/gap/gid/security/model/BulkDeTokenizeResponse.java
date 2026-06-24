package com.gap.gid.security.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Builder
@Getter
@AllArgsConstructor
@NoArgsConstructor
public class BulkDeTokenizeResponse {

    private String messageId;
    private String reference;
    private List<DeTokenizeResponse> batches;
}
