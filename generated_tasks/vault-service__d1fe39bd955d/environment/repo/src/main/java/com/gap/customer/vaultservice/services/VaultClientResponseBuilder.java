package com.gap.customer.vaultservice.services;

import com.gap.customer.vaultservice.exception.VaultServiceException;
import com.gap.customer.vaultservice.models.SearchResponse;
import com.gap.customer.vaultservice.models.TokenRequest;
import com.gap.customer.vaultservice.models.TokenResponse;
import com.gap.customer.vaultservice.models.TokenSearchRequest;
import com.gap.customer.vaultservice.models.VaultClientResponse;
import com.gap.customer.vaultservice.models.VaultRequest;
import com.gap.customer.vaultservice.models.VaultResponse;
import com.gap.customer.vaultservice.models.VaultSearchRequest;
import java.util.List;

public interface VaultClientResponseBuilder {

    List<SearchResponse> buildResponsesForVaultSearch(List<VaultSearchRequest> vaultSearchRequests, VaultClientResponse response) throws VaultServiceException;

    List<SearchResponse> buildResponsesForTokenSearch(List<TokenSearchRequest> tokenSearchRequests, VaultClientResponse response) throws VaultServiceException;

    List<VaultResponse> buildVaultResponses(List<VaultRequest> vaultRequests, VaultClientResponse response) throws VaultServiceException;

    List<TokenResponse> buildResponsesForTokens(List<TokenRequest> tokenRequests, VaultClientResponse response) throws VaultServiceException;

    List<TokenResponse> buildResponsesForTokenEntries(List<VaultRequest> vaultRequests, VaultClientResponse response) throws VaultServiceException;
}