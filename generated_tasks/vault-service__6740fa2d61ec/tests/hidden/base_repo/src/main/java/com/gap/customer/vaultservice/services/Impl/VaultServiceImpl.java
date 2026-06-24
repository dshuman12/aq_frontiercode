package com.gap.customer.vaultservice.services.Impl;

import com.gap.customer.vaultservice.Validators.SearchValidators;
import com.gap.customer.vaultservice.Validators.VaultEntryServiceValidator;
import com.gap.customer.vaultservice.exception.VaultServiceException;
import com.gap.customer.vaultservice.models.SearchResponse;
import com.gap.customer.vaultservice.models.VaultClientRequest;
import com.gap.customer.vaultservice.models.VaultClientResponse;
import com.gap.customer.vaultservice.models.VaultFeatureToggle;
import com.gap.customer.vaultservice.models.VaultRequest;
import com.gap.customer.vaultservice.models.VaultResponse;
import com.gap.customer.vaultservice.models.VaultSearchRequest;
import com.gap.customer.vaultservice.services.ServiceHeaders;
import com.gap.customer.vaultservice.services.VaultClientRequestBuilder;
import com.gap.customer.vaultservice.services.VaultClientResponseBuilder;
import com.gap.customer.vaultservice.services.VaultClientService;
import com.gap.customer.vaultservice.services.VaultService;
import com.gap.customer.vaultservice.util.VaultConstants;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;


@Slf4j
@Service
@RequiredArgsConstructor
public class VaultServiceImpl implements VaultService, ServiceHeaders {

    private final VaultClientRequestBuilder vaultClientRequestBuilder;
    private final VaultClientResponseBuilder vaultClientResponseBuilder;
    private final SearchValidators searchValidators;
    private final VaultClientService vaultClientService;
    private final ClientMediator clientMediator;
    private final VaultFeatureToggle vaultFeatureToggle;
    private final VaultEntryServiceValidator vaultEntryServiceValidator;
    private VaultClientRequest vaultClientRequest;


    @SuppressWarnings({"unchecked"})
    @Override
    public ResponseEntity<List<VaultResponse>> createVaultEntries(List<VaultRequest> vaultRequests, Map<String, String> headers, boolean isLegacy) throws VaultServiceException {
        String xAppName = headers.get(VaultConstants.X_APP_NAME_HEADER);
        if (log.isDebugEnabled()) {
            log.info("app-name : {} , endpoint : vault-entries , request : {}", xAppName, VaultRequest.toMaskedString(vaultRequests));
        }

        if (isLegacy) {
            vaultEntryServiceValidator.hasValidVaultPostRequestsForLegacy(vaultRequests, xAppName);
        } else {
            vaultEntryServiceValidator.hasValidVaultPostRequests(vaultRequests, xAppName);
        }
        var groupRequestsByType = groupRequestsByType(vaultRequests);
        var vaultResponses = new ArrayList<VaultResponse>();
        for (var requestListByType : groupRequestsByType) {
            if (log.isDebugEnabled()) {
                log.info("Vault Entries Requests {} to VAULT_ID , app-name : {}", requestListByType.get(0).getType(), xAppName);
            }
            vaultClientRequest = vaultClientRequestBuilder.buildVaultClientRequestsForVaultEntries(requestListByType);
            var responseList = vaultClientResponseBuilder.buildVaultResponses(requestListByType, getVaultClientResponse(vaultClientRequest, headers));
            vaultResponses.addAll(responseList);
        }
        if (log.isDebugEnabled()) {
            log.info("app-name : {} , endpoint : vault-entries , response : {}", xAppName, VaultResponse.toMaskedString(vaultResponses));
        }
        vaultResponses.sort(Comparator.comparing(VaultResponse::getIndex));
        return new ResponseEntity(vaultResponses, setResponseHeaders(), HttpStatus.OK);
    }


    @SuppressWarnings({"unchecked"})
    @Override
    public ResponseEntity<List<SearchResponse>> searchVaultEntriesByVaultId(List<VaultSearchRequest> vaultSearchRequests, Map<String, String> headers) throws VaultServiceException {
        String xAppName = headers.get(VaultConstants.X_APP_NAME_HEADER);
        if (log.isDebugEnabled()) {
            log.info("app-name : {} , endpoint : vault-entries/search , request : {}", xAppName, VaultSearchRequest.toMaskedString(vaultSearchRequests));
        }
        searchValidators.validateVaultSearch(vaultSearchRequests);
        var groupRequestsByType = groupRequestsByReturnType(vaultSearchRequests);
        var vaultResponses = new ArrayList<SearchResponse>();
        for (var requestListByType : groupRequestsByType) {
            if (log.isDebugEnabled()) {
                log.info("Vault Entries Search Requests VAULT_ID to {} ,  app-name : {}", requestListByType.get(0).getReturnType(), xAppName);
            }
            vaultClientRequest = vaultClientRequestBuilder.buildVaultClientRequestForVaultSearch(requestListByType);
            var responseList = vaultClientResponseBuilder.buildResponsesForVaultSearch(
                    requestListByType,
                    getVaultClientResponse(vaultClientRequest, headers)
            );
            vaultResponses.addAll(responseList);
        }
        if (log.isDebugEnabled()) {
            log.info("app-name : {} , endpoint : vault-entries/search , response : {}", xAppName, SearchResponse.toMaskedString(vaultResponses));
        }
        vaultResponses.sort(Comparator.comparing(SearchResponse::getIndex));
        return new ResponseEntity(vaultResponses, setResponseHeaders(), HttpStatus.OK);

    }

    private VaultClientResponse getVaultClientResponse(VaultClientRequest vaultClientRequest, Map<String, String> headers) throws VaultServiceException {
        if (vaultFeatureToggle.isLegacyCloud()) {
            return vaultClientService.getVaultId(headers, vaultClientRequest);
        } else {
            if (vaultClientRequest.getResponseFormat().equals(VaultConstants.REQ_TYPE_VAULT_ID)) {
                return clientMediator.mapperForVaultEntries(vaultClientRequest, headers.get(VaultConstants.X_APP_NAME_HEADER));
            } else {
                return clientMediator.mapperForVaultEntriesSearch(vaultClientRequest, headers.get(VaultConstants.X_APP_NAME_HEADER));
            }
        }
    }

    private Collection<List<VaultRequest>> groupRequestsByType(List<VaultRequest> vaultRequests) {
        return vaultRequests.stream()
                .collect(Collectors.groupingBy(VaultRequest::getType))
                .values();
    }

    private Collection<List<VaultSearchRequest>> groupRequestsByReturnType(List<VaultSearchRequest> vaultSearchRequests) {
        return vaultSearchRequests.stream()
                .collect(Collectors.groupingBy(VaultSearchRequest::getReturnType))
                .values();
    }

}

