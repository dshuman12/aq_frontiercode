package com.gap.customer.vaultservice.services.Impl;

import com.gap.customer.vaultservice.exception.VaultServiceException;
import com.gap.customer.vaultservice.models.MatchRequest;
import com.gap.customer.vaultservice.models.MatchResponse;
import com.gap.customer.vaultservice.models.VaultClientRequest;
import com.gap.customer.vaultservice.models.VaultClientResponse;

public interface VaultClientResponseHelper {

    VaultClientResponse createVaultIdDataForEncryptedCard(VaultClientRequest vaultClientRequest, String appName) throws VaultServiceException;
    VaultClientResponse searchByVaultIdForEncryptedCard(VaultClientRequest vaultClientRequest) throws VaultServiceException;
    VaultClientResponse createVaultIdDataForCreditCard(VaultClientRequest vaultClientRequest, String appName) throws VaultServiceException;
    VaultClientResponse searchByVaultIdForToken(VaultClientRequest vaultClientRequest, String appName) throws VaultServiceException;
    VaultClientResponse createTokenEntriesForCreditCardNumber(VaultClientRequest vaultClientRequest);
    VaultClientResponse createVaultIdDataForPassword(VaultClientRequest vaultClientRequest, String appName) throws VaultServiceException;
    MatchResponse matchPassword(MatchRequest matchRequest) throws VaultServiceException;
}
