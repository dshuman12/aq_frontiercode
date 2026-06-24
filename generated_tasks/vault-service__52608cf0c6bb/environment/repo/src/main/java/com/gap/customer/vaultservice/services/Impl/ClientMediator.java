package com.gap.customer.vaultservice.services.Impl;

import com.gap.customer.vaultservice.dto.TokenDataDTO;
import com.gap.customer.vaultservice.error.ErrorEntityCodes;
import com.gap.customer.vaultservice.exception.VaultServiceException;
import com.gap.customer.vaultservice.models.MatchRequest;
import com.gap.customer.vaultservice.models.MatchResponse;
import com.gap.customer.vaultservice.models.SearchResponse;
import com.gap.customer.vaultservice.models.TokenResponse;
import com.gap.customer.vaultservice.models.TokenSearchRequest;
import com.gap.customer.vaultservice.models.VaultClientRequest;
import com.gap.customer.vaultservice.models.VaultClientResponse;
import com.gap.customer.vaultservice.models.VaultFeatureToggle;
import com.gap.customer.vaultservice.models.VaultRequest;
import com.gap.customer.vaultservice.util.VaultConstants;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.IntStream;


@Component
@RequiredArgsConstructor
@Slf4j
public class ClientMediator {

    private final VaultClientResponseHelper vaultClientResponseHelper;
    private final TokenClientAdapter tokenClientAdapter;
    private final VaultFeatureToggle vaultFeatureToggle;

    public VaultClientResponse mapperForVaultEntries(VaultClientRequest vaultClientRequest, String appName) throws VaultServiceException {
        if (log.isDebugEnabled()) {
            log.info("Vault Entries Requests {} to {} , app-name : {}",
                    vaultClientRequest.getRequestFormat(), vaultClientRequest.getResponseFormat(), appName);
        }
        if (VaultConstants.REQ_TYPE_CREDIT_CARD_NUMBER.equals(vaultClientRequest.getRequestFormat())) {
            return vaultClientResponseHelper.createVaultIdDataForCreditCard(vaultClientRequest, appName);
        }
        if (VaultConstants.REQ_TYPE_PASSWORD.equals(vaultClientRequest.getRequestFormat())) {
            return vaultClientResponseHelper.createVaultIdDataForPassword(vaultClientRequest, appName);
        }
        return vaultClientResponseHelper.createVaultIdDataForEncryptedCard(vaultClientRequest, appName);

    }


    public VaultClientResponse mapperForVaultEntriesSearch(VaultClientRequest vaultClientRequest, String appName) throws VaultServiceException {
        if (log.isDebugEnabled()) {
            log.info("Vault Entries Search Requests {} to {} , app-name : {}",
                    vaultClientRequest.getRequestFormat(), vaultClientRequest.getResponseFormat(), appName);
        }
        if ((vaultClientRequest.getResponseFormat().equals(VaultConstants.DATA_TYPE_TOKEN_SEARCH)) ||
                vaultClientRequest.getResponseFormat().equals(VaultConstants.DATA_TYPE_CREDIT_CARD_NUMBER)) {
            if (log.isDebugEnabled()) {
                log.info("The search is for " + vaultClientRequest.getResponseFormat());
            }
            return vaultClientResponseHelper.searchByVaultIdForToken(vaultClientRequest, appName);
        }
        return vaultClientResponseHelper.searchByVaultIdForEncryptedCard(vaultClientRequest);
    }

    public List<TokenResponse> mapperForTokenEntries(List<VaultRequest> vaultRequests, String appName) throws VaultServiceException {
        var creditCardNumbers = new ArrayList<String>();
        IntStream.range(0, vaultRequests.size()).forEach(index ->
                creditCardNumbers.add(vaultRequests.get(index).getPlaintext()));
        var tokenDataDTOS = tokenClientAdapter.store(creditCardNumbers, appName);
        return IntStream.range(0, vaultRequests.size()).mapToObj(index -> {
            var tokenDataDTO = tokenDataDTOS.get(index);
            return TokenResponse.builder()
                    .token(tokenDataDTO.getVoltageToken())
                    .bfToken(tokenDataDTO.getBluefinToken())
                    .tokenId(tokenDataDTO.getBluefinId())
                    .vaultId(tokenDataDTO.getVaultId())
                    .index(vaultRequests.get(index).getIndex())
                    .build();
        }).collect(Collectors.toList());
    }

    public List<SearchResponse> mapperForTokenEntriesSearch(List<TokenSearchRequest> tokenSearchRequests, String appName) throws VaultServiceException {
        ArrayList<SearchResponse> searchResponses = new ArrayList<>();
        Map<Boolean, List<TokenSearchRequest>> groupedRequests = groupByTokenIdValue(tokenSearchRequests);
        List<TokenSearchRequest> voltageTokenSearchRequests = groupedRequests.get(true);
        List<TokenSearchRequest> bluefinTokenSearchRequests = groupedRequests.get(false);
        if (bluefinTokenSearchRequests != null && !bluefinTokenSearchRequests.isEmpty()) {
            if(!vaultFeatureToggle.isBluefinEnabled()) {
                throw new VaultServiceException(ErrorEntityCodes.BLUEFIN_NOT_SUPPORTED);
            }
            searchResponses.addAll(getBluefinTokenSearchResponses(bluefinTokenSearchRequests, appName));
        }
        if (voltageTokenSearchRequests != null && !voltageTokenSearchRequests.isEmpty()) {
            searchResponses.addAll(getVoltageTokenSearchResponses(voltageTokenSearchRequests, appName));
        }
        return searchResponses;
    }

    private List<TokenDataDTO> processBluefinTokenSearch(List<TokenSearchRequest> bluefinTokenSearchRequests, String appName) throws VaultServiceException {
        List<TokenDataDTO> requestBluefinTokenDataDTOs = bluefinTokenSearchRequests.stream()
                .map(tokenSearchRequest -> TokenDataDTO.builder()
                        .bluefinToken(tokenSearchRequest.getToken())
                        .bluefinId(tokenSearchRequest.getTokenId())
                        .build()
                ).collect(Collectors.toList());
        return tokenClientAdapter.retrieveVaultIdsForBluefinTokens(requestBluefinTokenDataDTOs, appName);
    }

    private List<TokenDataDTO> processVoltageTokenSearch(List<TokenSearchRequest> voltageTokenSearchRequests, String appName) throws VaultServiceException {
        List<TokenDataDTO> requestVoltageTokenDataDTOs = voltageTokenSearchRequests.stream()
                .map(tokenSearchRequest -> TokenDataDTO.builder()
                        .voltageToken(tokenSearchRequest.getToken())
                        .build()
                ).collect(Collectors.toList());
        return tokenClientAdapter.retrieveVaultIdsFor(requestVoltageTokenDataDTOs, appName);
    }

    private Map<Boolean, List<TokenSearchRequest>> groupByTokenIdValue(List<TokenSearchRequest> tokenSearchRequests) {
        return tokenSearchRequests.stream()
                .collect(Collectors.groupingBy((TokenSearchRequest tokenSearchRequest) ->
                        StringUtils.isBlank(tokenSearchRequest.getTokenId()))
                );
    }

    private List<SearchResponse> getBluefinTokenSearchResponses(List<TokenSearchRequest> bluefinTokenSearchRequests, String appName) throws VaultServiceException {
        List<TokenDataDTO> responseBluefinTokenDataDTOs = processBluefinTokenSearch(bluefinTokenSearchRequests, appName);

        return IntStream.range(0, bluefinTokenSearchRequests.size()).mapToObj(index -> {
            TokenDataDTO tokenDataDTO = responseBluefinTokenDataDTOs.get(index);
            return SearchResponse.builder()
                    .responseData(tokenDataDTO.getVaultId())
                    .token(tokenDataDTO.getVoltageToken())
                    .index(bluefinTokenSearchRequests.get(index).getIndex())
                    .build();
        }).collect(Collectors.toList());
    }

    private List<SearchResponse> getVoltageTokenSearchResponses(List<TokenSearchRequest> voltageTokenSearchRequests, String appName) throws VaultServiceException {
        List<TokenDataDTO> responseVoltageTokenDataDTOs = processVoltageTokenSearch(voltageTokenSearchRequests, appName);

        return IntStream.range(0, voltageTokenSearchRequests.size()).mapToObj(index -> {
            TokenDataDTO tokenDataDTO = responseVoltageTokenDataDTOs.get(index);
            return SearchResponse.builder()
                    .responseData(tokenDataDTO.getVaultId())
                    .token(tokenDataDTO.getBluefinToken())
                    .tokenId(tokenDataDTO.getBluefinId())
                    .index(voltageTokenSearchRequests.get(index).getIndex())
                    .build();
        }).collect(Collectors.toList());
    }

    /*
    here this mapper for match will map the match request with
    required data types to route to further client service class
     */
    public MatchResponse mapperForMatch(MatchRequest matchRequest) throws VaultServiceException {
        return vaultClientResponseHelper.matchPassword(matchRequest);
    }

}
