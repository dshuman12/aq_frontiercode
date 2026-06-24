package com.gap.customer.vaultservice.models;

import com.gap.customer.vaultservice.util.ObjectMasker;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.validation.constraints.NotNull;
import java.util.ArrayList;
import java.util.List;

@Builder
@Data
@AllArgsConstructor
@NoArgsConstructor
public class LookUpData {
    @NotNull
    private String lookupValue;

    @NotNull
    private String lookupKey;

    public static String toMaskedString(List<LookUpData> lookUpRequests) {
        return ObjectMasker.getMaskedString(lookUpRequests, new ArrayList<>());
    }
}
