package com.gap.customer.vaultservice.models;

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
public class TokenRequest {

    private String type;

    private String data;

    private Integer index;

    public static String toMaskedString(List<TokenRequest> tokenRequests) {
        return ObjectMasker.getMaskedString(tokenRequests, getFieldsToMask());
    }

    public static List<String> getFieldsToMask() {

        return new ArrayList<String>();
    }
}
