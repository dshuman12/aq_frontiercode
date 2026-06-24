package com.gap.customer.vaultservice.models;

import lombok.Builder;
import lombok.Getter;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;

import java.util.Date;


@Table("ECRP_DATA_03_T")
@Getter
@Builder
// CodeReview: rename class to Password
public class Password {
    @Id
    @Column("VLT_ID")
    private String vaultId;
    @Column("CRT_DTTM")
    private Date creationDateTime;
    @Column("DATA_TYP_ECRP_KEY_ID")
    private Integer dataTypeKeyDataId;
    @Column("ECRP_DATA_BINY")
    private byte[] cipherText;
    @Column("HASH_DATA_TXT")
    private String hashValue;
    @Column("JAVA_DATA_OBJ_VER_NBR")
    private Integer javaDataObjectVersionNumber;
    @Column("CRT_USER_ID")
    private String createdByUserId;
    @Column("LST_UPDT_USER_ID")
    private String lastUpdatedByUserId;
    @Column("LST_UPDT_DTTM")
    private Date lastUpdateDateTime;
}
