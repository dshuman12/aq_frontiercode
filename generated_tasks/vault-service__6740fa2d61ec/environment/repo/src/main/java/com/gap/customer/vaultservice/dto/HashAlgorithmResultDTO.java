package com.gap.customer.vaultservice.dto;

import lombok.Builder;
import lombok.Getter;
import org.springframework.data.relational.core.mapping.Column;


@Getter
@Builder
public class HashAlgorithmResultDTO {

    @Column(value = "HASH_ALGR_ID")
    private int dataId;

    @Column(value = "HASH_ALGR_NM")
    private String value;
}
