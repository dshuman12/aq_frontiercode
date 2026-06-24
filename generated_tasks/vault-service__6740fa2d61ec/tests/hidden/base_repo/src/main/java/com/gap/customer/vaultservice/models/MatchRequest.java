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
public class MatchRequest {

    private String type;

    private String plaintext;

    private String vaultId;


    public static String toMaskedString(MatchRequest matchRequest) {
        ArrayList<Object> list = new ArrayList<>();
        list.add(matchRequest);
        return ObjectMasker.getMaskedString(list, getFieldsToMask());
    }

    public static List<String> getFieldsToMask() {
        List<String> fieldsToMask = new ArrayList<String>();
        fieldsToMask.add("plaintext");
        fieldsToMask.add("vaultId");
        return fieldsToMask;
    }
}
