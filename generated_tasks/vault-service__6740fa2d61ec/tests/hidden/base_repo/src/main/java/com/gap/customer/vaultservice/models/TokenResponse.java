package com.gap.customer.vaultservice.models;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.gap.customer.vaultservice.util.ObjectMasker;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Builder
@Data
@AllArgsConstructor
@NoArgsConstructor
@JsonInclude (JsonInclude.Include.NON_NULL)
public class TokenResponse {

    private String token;

    private String bfToken;

    private String tokenId;

    private String vaultId;

    private Integer index;

    public TokenResponse(String token, Integer index) {
        this.token = token;
        this.index = index;
    }

    public static String toMaskedString(List<TokenResponse> tokenResponses) {
        return ObjectMasker.getMaskedString(tokenResponses, getFieldsToMask());
    }

    public static List<String> getFieldsToMask() {
        List<String> fieldsToMask = new ArrayList<String>();
        fieldsToMask.add("token");
        fieldsToMask.add("bfToken");
        fieldsToMask.add("tokenId");
        return fieldsToMask;
    }
}
