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
public class VaultResponse {

	private String vaultId;

	private Integer index;

	public static String toMaskedString(List<VaultResponse> vaultResponses) {
		return ObjectMasker.getMaskedString(vaultResponses, getFieldsToMask());
	}

	public static List<String> getFieldsToMask() {
		List<String> fieldsToMask = new ArrayList<String>();
		fieldsToMask.add("vaultId");
		return fieldsToMask;
	}
}
