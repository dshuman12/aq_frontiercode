package com.gap.customer.vaultservice.models;

import java.util.ArrayList;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@JsonIgnoreProperties(ignoreUnknown = true)
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class VaultClientResponse {
	@JsonProperty("responseFormat")
    protected String responseFormat;
	@JsonProperty("requestFormat")
    protected String requestFormat;
	@JsonProperty("result")
    protected ArrayList<VaultClientResult> result;
}
