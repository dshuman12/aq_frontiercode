package com.gap.customer.vaultservice.models;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Data;


@JsonIgnoreProperties(ignoreUnknown = true)
@Data
@Builder
public class VaultClientRequest {
	@JsonProperty("responseFormat")
    protected String responseFormat;
	@JsonProperty("requestFormat")
    protected String requestFormat;
	@JsonProperty("requestData")
    protected String[] requestData;
}
