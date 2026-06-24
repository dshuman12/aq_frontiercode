package com.gap.customer.vaultservice.models;

import lombok.Getter;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;

import java.math.BigDecimal;
import java.util.Date;

@Table ("ECRP_DATA_01_T")
@Getter
// CodeReview: rename class to EncryptedData

public class EncryptedData {
    @Id
    @Column ("VLT_ID")
    private String vaultId;

    @Column ("CRT_DTTM")
    private Date creationDate;

    @Column ("DATA_TYP_ECRP_KEY_ID")
    private BigDecimal dataTypeKeyDataId;

    @Column ("ECRP_DATA_BINY")
    private byte[] cipherText;

    @Column ("HASH_DATA_TXT")
    private String hashValue;

    @Column ("JAVA_DATA_OBJ_VER_NBR")
    private String javaDataObjectVersionNumber;

    @Column ("CRT_USER_ID")
    private String createdByUser;

    @Column ("LST_UPDT_USER_ID")
    private String lastUpdatedByUser;

    @Column ("LST_UPDT_DTTM")
    private Date lastUpdatedDate;
}
