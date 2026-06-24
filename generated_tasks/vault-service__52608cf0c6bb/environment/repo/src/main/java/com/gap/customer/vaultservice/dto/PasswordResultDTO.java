package com.gap.customer.vaultservice.dto;

import lombok.Builder;
import lombok.Getter;
import org.springframework.data.relational.core.mapping.Column;

@Getter
@Builder
public class PasswordResultDTO {
    @Column("VLT_ID")
    private String vaultId;
    @Column("ECRP_DATA_BINY")
    private byte[] cipherText;
    @Column("HASH_DATA_TXT")
    private String hashValue;
    @Column("DATA_TYP_ECRP_KEY_ID")
    private String dataTypeEncryptedKeyId;
}
