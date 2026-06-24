package com.gap.customer.vaultservice.models;

import java.util.ArrayList;
import java.util.List;


import com.gap.customer.vaultservice.util.ObjectMasker;
import lombok.*;


@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class VaultRequest {

	private String type;

	private String plaintext;

	private Integer index;


	public static String toMaskedString(List<VaultRequest> vaultRequests) {
		return ObjectMasker.getMaskedString(vaultRequests, getFieldsToMask());
	}

	public static List<String> getFieldsToMask() {
		List<String> fieldsToMask = new ArrayList<String>();

		return fieldsToMask;
	}
}
