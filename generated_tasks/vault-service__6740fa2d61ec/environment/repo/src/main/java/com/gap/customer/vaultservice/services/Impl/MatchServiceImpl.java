package com.gap.customer.vaultservice.services.Impl;

import com.gap.customer.vaultservice.Validators.MatchServiceValidator;
import com.gap.customer.vaultservice.exception.VaultServiceException;
import com.gap.customer.vaultservice.models.MatchRequest;
import com.gap.customer.vaultservice.models.MatchResponse;
import com.gap.customer.vaultservice.models.VaultFeatureToggle;
import com.gap.customer.vaultservice.services.MatchService;
import com.gap.customer.vaultservice.services.ServiceHeaders;
import com.gap.customer.vaultservice.util.VaultConstants;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class MatchServiceImpl implements MatchService, ServiceHeaders {

    private final MatchServiceValidator matchServiceValidator;
    private final VaultFeatureToggle vaultFeatureToggle;
    private final ClientMediator clientMediator;

    @Override
    public ResponseEntity<MatchResponse> match(MatchRequest matchRequest, Map<String, String> headers) throws VaultServiceException {
        matchServiceValidator.hasValidVaultPostRequests(matchRequest);
        String xAppName = headers.get(VaultConstants.X_APP_NAME_HEADER);
        if (log.isDebugEnabled()) {
            log.info("Match Request with {} and VAULT_ID : app-name : {}", matchRequest.getType(), xAppName);
            log.info("app-name : {} , endpoint : match , request : {}", xAppName, MatchRequest.toMaskedString(matchRequest));
        }
        MatchResponse matchResponse = getMatchResponse(matchRequest);
        if (log.isDebugEnabled()) {
            log.info("app-name : {} , endpoint : match , response : {}", xAppName, matchResponse);
        }
        return new ResponseEntity<>(matchResponse, setResponseHeaders(), HttpStatus.OK);
    }

    private MatchResponse getMatchResponse(MatchRequest matchRequest) throws VaultServiceException {
        if (vaultFeatureToggle.isLegacyCloud()) {
            log.error("Match Request is not supported with legacy flag");
            throw new VaultServiceException("Match Request is not supported");
        }
        return clientMediator.mapperForMatch(matchRequest);
    }
}
