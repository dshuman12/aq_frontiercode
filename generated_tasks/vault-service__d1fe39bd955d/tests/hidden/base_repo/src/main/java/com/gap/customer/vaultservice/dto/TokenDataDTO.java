package com.gap.customer.vaultservice.dto;

import lombok.Builder;
import lombok.Getter;

@Builder
@Getter
public class TokenDataDTO {
    private String voltageToken;
    private String bluefinToken;
    private String bluefinId;
    private String vaultId;
    private String plaintext;

    public void setBluefinInfo(String bluefinToken, String bluefinId) {
        this.bluefinToken = bluefinToken;
        this.bluefinId = bluefinId;
    }

    public void setPlaintext(String plaintext) {
        this.plaintext = plaintext;
    }

    public void setVoltageToken(String voltageToken) {
        this.voltageToken = voltageToken;
    }

    public void setVaultId(String vaultId) {
        this.vaultId = vaultId;
    }
}
