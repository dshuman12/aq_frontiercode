package com.gap.customer.vaultservice.dto;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.relational.core.mapping.Column;

import java.math.BigDecimal;
import java.util.Date;


@Builder
@Getter
public class DataTypeKeyDataResultDTO {

    @Column(value = "DTEKT__DATA_TYP_ECRP_KEY_ID")
    private BigDecimal dtektDataTypEcrpKeyId;

    @Column(value = "DTEKT__KEY_EFF_END_DT")
    private Date dtektKeyEffEndDt;

    @Column(value="DTEKT__KEY_EFF_STRT_DT")
    private Date dtektKeyEffStrtDt;

    @Column(value="DTEKT__HASH_ALGR_ID")
    private BigDecimal dtektHashAlgrId;

    @Column(value="DTEKT__DATA_TYP_ID")
    private BigDecimal dtektDataTypId;

    @Column(value="DTEKT__ECRP_KEY_ID")
    private BigDecimal dtektEcrpKeyId;

    @Column(value="DTEKT__CRT_DTTM")
    private Date dtektCrtDttm;

    @Column(value="DTEKT__LST_UPDT_DTTM")
    private Date dtektLstUpdtDttm;

    @Column(value="DTEKT__LST_UPDT_USER_ID")
    private String dtektLstUpdtUserId;

    @Column(value="HAT__HASH_ALGR_ID")
    private BigDecimal hatHashAlgrId;

    @Column(value="HAT__HASH_ALGR_NM")
    private String hatHashAlgrNm;

    @Column(value="EKT__ECRP_KEY_ID")
    private BigDecimal ektEcrpKeyId;

    @Column(value="EKT__KEY_PVDR_NM")
    private String ektKeyPvdrNm;

    @Column(value="EKT__KEY_ALGR_TXT")
    private String ektKeyAlgrTxt;

    @Column(value="EKT__KEY_NM")
    private String ektKeyNm;

    @Column(value="EKT__INI_VCTR_BINY")
    private byte[] initializationVector;

    @Column(value="DTT__DATA_TYP_ID")
    private BigDecimal dttDataTypId;

    @Column(value="DTT__DATA_TYP_NM")
    private String dttDataTypNm;


}
