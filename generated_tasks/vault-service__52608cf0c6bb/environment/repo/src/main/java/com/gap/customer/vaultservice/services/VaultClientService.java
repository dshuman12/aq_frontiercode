package com.gap.customer.vaultservice.services;

import com.gap.customer.vaultservice.client.restclient.impl.VaultRestClientImpl;
import com.gap.customer.vaultservice.exception.LegacyVaultServiceException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import com.gap.customer.vaultservice.models.VaultClientRequest;
import com.gap.customer.vaultservice.models.VaultClientResponse;

import java.util.Map;

@Slf4j
@Component
public class VaultClientService {

	@Autowired
	public VaultRestClientImpl vaultRestClientImpl;


	private static final String TOKEN_ENTRIES_PATH = "/EncryptionResourcesProvider/resources/v2/encryption/retrieve/token-entries";
	private static final String RETRIVE_PATH = "/EncryptionResourcesProvider/resources/v2/encryption/retrieve";

	public VaultClientResponse getVaultId(Map<String, String> headers, VaultClientRequest vaultClientRequest) throws LegacyVaultServiceException {
		return vaultRestClientImpl.getVaultClientResponse(headers,  RETRIVE_PATH, vaultClientRequest);
	}

	public VaultClientResponse getTokenEntries(Map<String, String> headers, VaultClientRequest vaultClientRequest) throws LegacyVaultServiceException {
		return vaultRestClientImpl.getVaultClientResponse(headers,  TOKEN_ENTRIES_PATH, vaultClientRequest);
	}

}
