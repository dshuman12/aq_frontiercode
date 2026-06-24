package com.gap.customer.vaultservice.dto;

import lombok.Builder;
import lombok.Getter;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;

@Getter
@Builder
@Table("LOOKUP_DATA")
public class LookUpDataDTO {
    @Column("LookupKey")
    private String lookupKey;

    @Column("LookupValue")
    private String lookupValue;

    public String getLookupValue() {
        return lookupValue;
    }
}
