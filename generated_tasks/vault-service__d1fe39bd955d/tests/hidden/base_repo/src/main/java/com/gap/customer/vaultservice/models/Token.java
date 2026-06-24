package com.gap.customer.vaultservice.models;

import lombok.Builder;
import lombok.Getter;
import lombok.ToString;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;

import java.util.Date;


@Table("ECRP_DATA_04_T")
@Builder
@Getter
@ToString

// CodeReview: rename class to Token

public class Token {
    @Id
    @Column("VLT_ID")
    private String vaultId;

    @Column("TOKN_FRMT_TXT")
    private String tokenFormatText;

    @Column("PMT_ACCT_TOKN_NBR")
    private String voltageToken;

    @Column("CRT_USER_ID")
    private String createdByUserId;

    @Column("LST_UPDT_USER_ID")
    private String lastUpdatedByUserId;

    @Column("LST_UPDT_DTTM")
    private Date lastUpdatedDateAndTime;

    @Column("CRT_DTTM")
    private Date currentDateAndTime;

    @Column("BFTOKEN")
    private String bluefinToken;

    @Column("BFID")
    private String bluefinId;
}
