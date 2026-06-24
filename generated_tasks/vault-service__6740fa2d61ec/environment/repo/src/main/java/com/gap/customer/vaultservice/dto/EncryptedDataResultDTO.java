package com.gap.customer.vaultservice.dto;

import lombok.Builder;
import lombok.Getter;
import org.springframework.data.relational.core.mapping.Column;

import java.math.BigDecimal;

@Builder
@Getter
public class EncryptedDataResultDTO {
    @Column ("ED01T__VLT_ID")
    private String vaultId;

    @Column ("ED01T__ECRP_DATA_BINY")
    private byte[] cipherText;

    @Column ("ED01T__HASH_DATA_TXT")
    private String hashValue;

    @Column ("ED01T__DATA_TYP_ECRP_KEY_ID")
    private BigDecimal dataTypeKeyDataId;

    @Column("DTT__DATA_TYP_NM")
    private String dataType;

    @Column("ED01T__BFTOKEN")
    private String bfToken;

    @Column("ED01T__BFID")
    private String bfId;
}
