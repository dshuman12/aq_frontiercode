package com.gap.customer.vaultservice.models;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@JsonIgnoreProperties(ignoreUnknown = true)
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class VaultClientResult {
	@JsonProperty("requestData")
    protected String requestData;
	@JsonProperty("responseData")
    protected String responseData;
    private String bluefinToken;
    private String bluefinId;
}
