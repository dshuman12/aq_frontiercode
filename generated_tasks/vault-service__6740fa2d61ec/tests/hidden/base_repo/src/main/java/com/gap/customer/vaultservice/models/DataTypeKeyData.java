package com.gap.customer.vaultservice.models;


import lombok.Builder;
import lombok.Getter;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;

import java.math.BigDecimal;
import java.util.Date;

@Builder
@Getter
@Table("DATA_TYP_ECRP_KEY_T")
// CodeReview: rename class to DataTypeKeyData. Move it to models package

public class DataTypeKeyData {
    @Id
    @Column("DATA_TYP_ECRP_KEY_ID")
    BigDecimal dataTypEcrpKeyId;

    @Column("DATA_TYP_ID")
    BigDecimal dataTypId;

    @Column("CRT_DTTM")
    Date crtDttm;

    @Column("KEY_EFF_STRT_DT")
    Date keyEffStrtDt;

    @Column("KEY_EFF_END_DT")
    Date keyEffEndDt;

    @Column("ECRP_KEY_ID")
    BigDecimal ecrpKeyId;

    @Column("JAVA_DATA_OBJ_VER_NBR")
    BigDecimal javaDataObjVerNbr;

    @Column("CRT_USER_ID")
    String crtUserId;

    @Column("LST_UPDT_USER_ID")
    String lstUpdtUserId;

    @Column("LST_UPDT_DTTM")
    Date lstUpdtDttm;

    @Column("HASH_ALGR_ID")
    BigDecimal hashAlgrId;

}
