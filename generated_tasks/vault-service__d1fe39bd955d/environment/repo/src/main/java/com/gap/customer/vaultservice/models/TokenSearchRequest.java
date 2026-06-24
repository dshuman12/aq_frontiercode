package com.gap.customer.vaultservice.models;

import com.gap.customer.vaultservice.util.ObjectMasker;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class TokenSearchRequest {

    private String returnType;

    private Integer index;

    private String token;

    private String tokenId;


    public static String toMaskedString(List<TokenSearchRequest> tokenSearchRequests) {
        return ObjectMasker.getMaskedString(tokenSearchRequests, getFieldsToMask());
    }

    public static List<String> getFieldsToMask() {
        List<String> fieldsToMask = new ArrayList<String>();
        fieldsToMask.add("token");
        fieldsToMask.add("tokenId");
        return fieldsToMask;
    }

}

