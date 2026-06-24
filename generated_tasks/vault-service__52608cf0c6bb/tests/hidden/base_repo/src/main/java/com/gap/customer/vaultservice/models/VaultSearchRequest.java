package com.gap.customer.vaultservice.models;

import java.util.ArrayList;
import java.util.List;

import com.gap.customer.vaultservice.util.ObjectMasker;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class VaultSearchRequest {

    private String returnType;

    private Integer index;

    private String  vaultId;


    public static String toMaskedString(List<VaultSearchRequest> vaultSearchRequests) {
        return ObjectMasker.getMaskedString(vaultSearchRequests, getFieldsToMask());
    }
    public static List<String> getFieldsToMask() {
        List<String> fieldsToMask = new ArrayList<String>();
        fieldsToMask.add("vaultId");
        return fieldsToMask;
    }

}
