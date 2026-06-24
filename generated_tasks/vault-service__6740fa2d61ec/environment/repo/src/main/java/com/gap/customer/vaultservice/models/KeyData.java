package com.gap.customer.vaultservice.models;

import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;
import java.util.Date;

@Table("ECRP_KEY_T")
// CodeReview: rename class to KeyData
public class KeyData {

    @Column("ECRP_KEY_ID")
    private int keyId;

    @Column("KEY_ALGR_TXT")
    private String keyAlgoTxt;

    @Column("INI_VCTR_BINY")
    private byte[] initVectorBinary;

    @Column("KEY_NM")
    private String keyName;

    @Column("KEY_PVDR_NM")
    private String keyProviderName;

    @Column("CRT_DTTM")
    private Date createdDateTime;

    @Column("CRT_USER_ID")
    private String creatorUserId;

    @Column("LST_UPDT_USER_ID")
    private String lastUpdatedUserId;

    @Column("JAVA_DATA_OBJ_VER_NBR")
    private int javaDataObjVerNumber;

    @Column("LST_UPDT_DTTM")
    private Date lastUpdatedDateTime;
}
