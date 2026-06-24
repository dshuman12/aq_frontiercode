package com.gap.customer.vaultservice.client.restclient;


import com.gap.customer.vaultservice.exception.LegacyVaultServiceException;
import com.gap.customer.vaultservice.models.VaultClientRequest;
import com.gap.customer.vaultservice.models.VaultClientResponse;
import org.springframework.stereotype.Component;

import javax.ws.rs.client.WebTarget;
import java.util.Map;



@Component
public interface  VaultRestClient {
        public VaultClientResponse buildResponse(WebTarget target,  Map<String, String> headers,String path, VaultClientRequest vaultClientRequest) throws LegacyVaultServiceException;

}
