package com.gap.customer.vaultservice.models;

import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;

import java.util.Date;

@Table("DATA_TYP_T")
// CodeReview: rename class to DataType. Move it to models package
public class DataType {
    @Column("DATA_TYP_ID")
    private int dataTypeId;

    @Column("DATA_TYP_NM")
    private String dataTypeName;

    @Column("CRT_USER_ID")
    private String userId;

    @Column("CRT_DTTM")
    private Date createDate;

    @Column("LST_UPDT_USER_ID")
    private String lastUpdateUserId;

    @Column("LST_UPDT_DTTM")
    private Date lastUpdatedDate;
}
