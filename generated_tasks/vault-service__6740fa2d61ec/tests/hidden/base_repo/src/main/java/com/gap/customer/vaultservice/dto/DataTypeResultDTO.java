package com.gap.customer.vaultservice.dto;

import lombok.Builder;
import lombok.Getter;
import org.springframework.data.relational.core.mapping.Column;

@Builder
@Getter
public class DataTypeResultDTO {
    @Column("DATA_TYP_ID")
    private int dataTypeId;

    @Column("DATA_TYP_NM")
    private String dataTypeName;
}
