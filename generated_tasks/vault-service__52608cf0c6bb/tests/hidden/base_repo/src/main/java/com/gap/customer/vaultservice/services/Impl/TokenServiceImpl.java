package com.gap.customer.vaultservice.services.Impl;

import com.gap.customer.vaultservice.Validators.VaultEntryServiceValidator;
import com.gap.customer.vaultservice.exception.VaultServiceException;
import com.gap.customer.vaultservice.models.SearchResponse;
import com.gap.customer.vaultservice.models.TokenRequest;
import com.gap.customer.vaultservice.models.TokenResponse;
import com.gap.customer.vaultservice.models.TokenSearchRequest;
import com.gap.customer.vaultservice.models.VaultClientRequest;
import com.gap.customer.vaultservice.models.VaultClientResponse;
import com.gap.customer.vaultservice.models.VaultFeatureToggle;
import com.gap.customer.vaultservice.models.VaultRequest;
import com.gap.customer.vaultservice.services.ServiceHeaders;
import com.gap.customer.vaultservice.services.TokenService;
import com.gap.customer.vaultservice.services.VaultClientRequestBuilder;
import com.gap.customer.vaultservice.services.VaultClientResponseBuilder;
import com.gap.customer.vaultservice.services.VaultClientService;
import com.gap.customer.vaultservice.util.VaultConstants;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;


@Component
@Slf4j
@RequiredArgsConstructor
public class TokenServiceImpl implements TokenService, ServiceHeaders {


    private final VaultClientRequestBuilder vaultClientRequestBuilder;
    private final VaultClientResponseBuilder vaultClientResponseBuilder;
    private final VaultClientService vaultClientService;
    private final VaultFeatureToggle vaultFeatureToggle;
    private final ClientMediator clientMediator;
    private final VaultEntryServiceValidator vaultEntryServiceValidator;

    @SuppressWarnings({"unchecked"})
    @Override
    // CodeReview2: CodeReview not done
    // Note: This API is not used anymore
    public ResponseEntity<List<TokenResponse>> createTokens(List<TokenRequest> tokenRequests, Map<String,String> headers) throws VaultServiceException {
        if (log.isDebugEnabled()) {
            log.debug(TokenRequest.toMaskedString(tokenRequests), log, headers);
        }
        vaultEntryServiceValidator.hasValidTokenRequest(tokenRequests);
        VaultClientRequest vaultClientRequest = vaultClientRequestBuilder.buildVaultClientRequestForTokens(tokenRequests);
        // CodeReview2: should the call be getVaultClientResponseForToken
        List<TokenResponse> responseList = vaultClientResponseBuilder.buildResponsesForTokens(tokenRequests,
                getVaultClientResponseForVaultId(vaultClientRequest, headers));

        List<TokenResponse> sortedResponseList = sortTokenResponsesByIndex(responseList);
        return new ResponseEntity<>(sortedResponseList, setResponseHeaders(), HttpStatus.OK);
    }

    @SuppressWarnings({"unchecked"})
    @Override
    public ResponseEntity<List<TokenResponse>> createTokenEntries(List<VaultRequest> vaultRequests, Map<String,String> headers) throws VaultServiceException {
        String xAppName = headers.get(VaultConstants.X_APP_NAME_HEADER);
        vaultEntryServiceValidator.hasValidVaultPostRequestsForTokenEntries(vaultRequests, xAppName);
        if (log.isDebugEnabled()) {
            log.info("Token Entries Requests {} to TOKEN , app-name : {}", vaultRequests.get(0).getType(), xAppName);
            log.info("app-name : {} , endpoint : token-entries , request : {}", xAppName, VaultRequest.toMaskedString(vaultRequests));
        }
        var responseList = getResponseListForTokenEntries(vaultRequests, headers);
        if (log.isDebugEnabled()) {
            log.info("app-name : {} , endpoint : token-entries , response : {}", xAppName, TokenResponse.toMaskedString(responseList));
        }
        var sortedResponseList = sortTokenResponsesByIndex(responseList);
        return new ResponseEntity<>(sortedResponseList, setResponseHeaders(), HttpStatus.OK);
    }

    @SuppressWarnings({"unchecked"})
    @Override
    public ResponseEntity<List<SearchResponse>> searchTokenEntriesByToken(List<TokenSearchRequest> tokenSearchRequests, Map<String, String> headers) throws VaultServiceException {
        vaultEntryServiceValidator.isValidsearchVaultIdbyToken(tokenSearchRequests);
        String xAppName = headers.get(VaultConstants.X_APP_NAME_HEADER);
        if (log.isDebugEnabled()) {
            log.info("Token Entries Search Requests TOKEN to {} , app-name : {}", tokenSearchRequests.get(0).getReturnType(), xAppName);
            log.info("app-name : {} , endpoint : token-entries/search , request : {}", xAppName, TokenSearchRequest.toMaskedString(tokenSearchRequests));
        }
        List<SearchResponse> responseList = getSearchResponses(tokenSearchRequests, headers);
        if (log.isDebugEnabled()) {
            log.info("app-name : {} , endpoint : token-entries/search , response : {}", xAppName, SearchResponse.toMaskedString(responseList));
        }
        List<SearchResponse> sortedResponseList = sortTokenSearchResponsesByIndex(responseList);
        return new ResponseEntity<>(sortedResponseList, setResponseHeaders(), HttpStatus.OK);
    }

    private List<SearchResponse> getSearchResponses(List<TokenSearchRequest> tokenSearchRequests, Map<String, String> headers) throws VaultServiceException {
        List<SearchResponse> responseList;
        if (vaultFeatureToggle.isLegacyCloud()) {
            VaultClientRequest vaultClientRequest = vaultClientRequestBuilder.buildVaultClientRequestsForTokenSearch(tokenSearchRequests);
            responseList = vaultClientResponseBuilder.buildResponsesForTokenSearch(tokenSearchRequests, vaultClientService.getVaultId(headers, vaultClientRequest));
        } else {
            if (log.isDebugEnabled()) {
                log.info("Token Entries Search Requests TOKEN to VAULT_ID , app-name : {}", headers.get(VaultConstants.X_APP_NAME_HEADER));
            }
            responseList = clientMediator.mapperForTokenEntriesSearch(tokenSearchRequests, headers.get(VaultConstants.X_APP_NAME_HEADER));
        }
        return responseList;
    }

    private List<TokenResponse> getResponseListForTokenEntries(List<VaultRequest> vaultRequests, Map<String, String> headers) throws VaultServiceException {
        List<TokenResponse> responseList;
        if (vaultFeatureToggle.isLegacyCloud()) {
            VaultClientRequest vaultClientRequest = vaultClientRequestBuilder.buildVaultClientRequestForTokenEntries(vaultRequests);
            var vaultClientResponse = vaultClientService.getTokenEntries(headers, vaultClientRequest);
            responseList = vaultClientResponseBuilder.buildResponsesForTokenEntries(vaultRequests,
                    vaultClientResponse);
        } else {
            if (log.isDebugEnabled()) {
                log.info("Token Entries Requests CREDIT_CARD_NUMBER to TOKEN , app-name : {}",
                        headers.get(VaultConstants.X_APP_NAME_HEADER));
            }
            responseList = clientMediator.mapperForTokenEntries(vaultRequests, headers.get(VaultConstants.X_APP_NAME_HEADER));
        }
        return responseList;
    }

    private List<SearchResponse> sortTokenSearchResponsesByIndex(List<SearchResponse> searchResponseList) {
        return searchResponseList.stream()
                .sorted(Comparator.comparing(SearchResponse::getIndex))
                .collect(Collectors.toList());
    }

    private List<TokenResponse> sortTokenResponsesByIndex(List<TokenResponse> tokenResponseList) {
        return tokenResponseList.stream()
                .sorted(Comparator.comparing(TokenResponse::getIndex))
                .collect(Collectors.toList());
    }

    //NOTE: This method belongs to /token API and PCF no longer supports it
    //TODO: To be removed 
    private VaultClientResponse getVaultClientResponseForVaultId(VaultClientRequest vaultClientRequest, Map<String, String> headers) throws VaultServiceException {
        if (vaultFeatureToggle.isLegacyCloud()) {
            return vaultClientService.getVaultId(headers, vaultClientRequest);
        }
        return null;
    }

}



