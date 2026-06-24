package com.gap.customer.vaultservice.services;

import com.gap.customer.vaultservice.models.TokenRequest;
import com.gap.customer.vaultservice.models.TokenSearchRequest;
import com.gap.customer.vaultservice.models.VaultClientRequest;
import com.gap.customer.vaultservice.models.VaultRequest;
import com.gap.customer.vaultservice.models.VaultSearchRequest;
import java.util.List;


public interface VaultClientRequestBuilder {

    VaultClientRequest buildVaultClientRequestForVaultSearch(List<VaultSearchRequest> vaultSearchRequests);

    VaultClientRequest buildVaultClientRequestsForTokenSearch(List<TokenSearchRequest> tokenSearchRequests);

    VaultClientRequest buildVaultClientRequestsForVaultEntries(List<VaultRequest> vaultRequests);

    VaultClientRequest buildVaultClientRequestForTokens(List<TokenRequest> tokenRequests);

    VaultClientRequest buildVaultClientRequestForTokenEntries(List<VaultRequest> vaultRequests);

}
