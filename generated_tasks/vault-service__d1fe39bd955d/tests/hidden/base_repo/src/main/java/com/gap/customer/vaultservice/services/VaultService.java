package com.gap.customer.vaultservice.services;

import com.gap.customer.vaultservice.exception.VaultServiceException;
import com.gap.customer.vaultservice.models.SearchResponse;
import com.gap.customer.vaultservice.models.VaultRequest;
import com.gap.customer.vaultservice.models.VaultResponse;
import com.gap.customer.vaultservice.models.VaultSearchRequest;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.Map;

public interface VaultService {

    ResponseEntity<List<VaultResponse>> createVaultEntries(List<VaultRequest> vaultRequests, Map<String, String> headers, boolean isLegacy) throws VaultServiceException;

    ResponseEntity<List<SearchResponse>> searchVaultEntriesByVaultId(List<VaultSearchRequest> vaultSearchRequests, Map<String, String> headers) throws VaultServiceException;
}
