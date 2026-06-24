package com.gap.customer.vaultservice.services;

import com.gap.customer.vaultservice.exception.VaultServiceException;
import com.gap.customer.vaultservice.models.SearchResponse;
import com.gap.customer.vaultservice.models.TokenRequest;
import com.gap.customer.vaultservice.models.TokenResponse;
import com.gap.customer.vaultservice.models.TokenSearchRequest;
import com.gap.customer.vaultservice.models.VaultRequest;
import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;

public interface TokenService {

    ResponseEntity<List<TokenResponse>> createTokens(List<TokenRequest> tokenRequests, Map<String, String> headers) throws VaultServiceException;

    ResponseEntity<List<TokenResponse>> createTokenEntries(List<VaultRequest> vaultRequests, Map<String, String> headers) throws VaultServiceException;

    ResponseEntity<List<SearchResponse>> searchTokenEntriesByToken(List<TokenSearchRequest> tokenSearchRequests, Map<String, String> headers) throws VaultServiceException;

}
