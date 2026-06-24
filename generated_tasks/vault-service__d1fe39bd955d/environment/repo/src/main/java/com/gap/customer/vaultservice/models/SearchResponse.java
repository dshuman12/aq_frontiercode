package com.gap.customer.vaultservice.models;


import java.util.ArrayList;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.gap.customer.vaultservice.util.ObjectMasker;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
public class SearchResponse {

    private String responseData;
    private String token;
    private String tokenId;
    private Integer index;

    public static String toMaskedString(List<SearchResponse> vaultResponses) {
        return ObjectMasker.getMaskedString(vaultResponses, getFieldsToMask());
    }

    public static List<String> getFieldsToMask() {
        List<String> fieldsToMask = new ArrayList<String>();
        fieldsToMask.add("responseData");
        fieldsToMask.add("token");
        fieldsToMask.add("tokenId");
        return fieldsToMask;
    }
}
