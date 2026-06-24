package com.gap.customer.vaultservice.models;

import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;
import java.util.Date;

@Table("HASH_ALGR_T")
// CodeReview: rename class to HashAlgorithm
public class HashAlgorithm {

    @Column("HASH_ALGR_ID")
    private int hashAlgrId;

    @Column("HASH_ALGR_NM")
    private String hashAlgrNm;

    @Column("CRT_DTTM")
    private Date createdDateTime;

    @Column("CRT_USER_ID")
    private String creatorUserId;

    @Column("LST_UPDT_USER_ID")
    private String lastUpdatedUserId;

    @Column("LST_UPDT_DTTM")
    private Date lastUpdatedDateTime;

}
