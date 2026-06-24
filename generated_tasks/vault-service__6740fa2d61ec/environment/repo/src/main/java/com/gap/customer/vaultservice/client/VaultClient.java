package com.gap.customer.vaultservice.client;

import javax.ws.rs.client.WebTarget;

import org.springframework.stereotype.Component;

import com.gap.customer.vaultservice.exception.LegacyVaultServiceException;
import com.gap.customer.vaultservice.models.VaultClientRequest;
import com.gap.customer.vaultservice.models.VaultClientResponse;

import java.util.Map;

@Component
public interface VaultClient {
	
	VaultClientResponse getVaultId(Map<String, String> headers, VaultClientRequest vaultClientRequest, String path) throws LegacyVaultServiceException;

	WebTarget getHealthCheckTarget();
}
