package com.gap.customer.vaultservice.dto;

import lombok.Builder;
import lombok.Getter;
import org.springframework.data.relational.core.mapping.Column;

@Builder
@Getter
public class KeyDataResultDTO {

    @Column(value = "ECRP_KEY_ID")
    private int dataId;

    @Column(value = "KEY_ALGR_TXT")
    private String algorithm;

    @Column(value="INI_VCTR_BINY")
    private byte[] initializationVector;

    @Column(value="KEY_NM")
    private String keyName;

    @Column(value="KEY_PVDR_NM")
    private String provider;

}
