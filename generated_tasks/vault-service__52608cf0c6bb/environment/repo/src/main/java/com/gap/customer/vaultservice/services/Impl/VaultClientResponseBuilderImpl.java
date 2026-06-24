package com.gap.customer.vaultservice.services.Impl;

import com.gap.customer.vaultservice.error.ErrorCodes;
import com.gap.customer.vaultservice.error.ErrorEntity;
import com.gap.customer.vaultservice.error.ErrorEntityCodes;
import com.gap.customer.vaultservice.error.ErrorEntityInternal;
import com.gap.customer.vaultservice.error.ErrorEntityMessage;
import com.gap.customer.vaultservice.exception.DataNotFoundException;
import com.gap.customer.vaultservice.exception.VaultServiceException;
import com.gap.customer.vaultservice.models.SearchResponse;
import com.gap.customer.vaultservice.models.TokenRequest;
import com.gap.customer.vaultservice.models.TokenResponse;
import com.gap.customer.vaultservice.models.TokenSearchRequest;
import com.gap.customer.vaultservice.models.VaultClientResponse;
import com.gap.customer.vaultservice.models.VaultClientResult;
import com.gap.customer.vaultservice.models.VaultRequest;
import com.gap.customer.vaultservice.models.VaultResponse;
import com.gap.customer.vaultservice.models.VaultSearchRequest;
import com.gap.customer.vaultservice.services.VaultClientResponseBuilder;
import org.apache.commons.collections4.CollectionUtils;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;



@Component
public class VaultClientResponseBuilderImpl implements VaultClientResponseBuilder {

    private static final Integer HTTP_STATUS_NOT_FOUND = 404;


    private boolean checkVaultIdFromResponse(List<VaultClientResult> results, List<SearchResponse> vaultResponseList, VaultSearchRequest request, boolean vaultIdFlag) {
        for (var vaultClientResult : results) {
            if (request.getVaultId().trim().equals(vaultClientResult.getRequestData())) {
                vaultResponseList.add(
                        SearchResponse.builder()
                                .responseData(vaultClientResult.getResponseData())
                                .index(request.getIndex())
                                .token(vaultClientResult.getBluefinToken())
                                .tokenId(vaultClientResult.getBluefinId())
                                .build());
                vaultIdFlag = true;
                break;
            }

        }
        return vaultIdFlag;
    }

    @Override
    public List<SearchResponse> buildResponsesForVaultSearch(List<VaultSearchRequest> vaultSearchRequests, VaultClientResponse response) throws DataNotFoundException {
        List<SearchResponse> vaultResponseList = new ArrayList<>();
        ArrayList<VaultClientResult> results = response.getResult();
        if (results == null) {
            throw new DataNotFoundException(ErrorEntityCodes.DATA_NOT_FOUND);
        }
        for (VaultSearchRequest request : vaultSearchRequests) {
            if (!checkVaultIdFromResponse(results, vaultResponseList, request, false)) {
                vaultResponseList.add(SearchResponse.builder()
                        .responseData(ErrorEntityMessage.INVALID_VAULT_ID_MESSAGE)
                        .index(request.getIndex())
                        .build()
                );

            }
        }
        return vaultResponseList;
    }

    @Override
    public List<SearchResponse> buildResponsesForTokenSearch(List<TokenSearchRequest> tokenSearchRequests, VaultClientResponse response)
            throws VaultServiceException {

        List<SearchResponse> vaultResponseList = new ArrayList<>();
        ArrayList<VaultClientResult> results = response.getResult();

        if (results == null) {
            throw new DataNotFoundException(ErrorEntityCodes.DATA_NOT_FOUND);
        }

        Set<String> invalidVaultId = new HashSet<String>();

        boolean isTokenFound;

        for (TokenSearchRequest request : tokenSearchRequests) {
            isTokenFound = false;
            for (VaultClientResult vaultClientResult : results) {
                if(request.getToken().trim().equals(vaultClientResult.getRequestData())){
                    vaultResponseList.add(SearchResponse.builder()
                            .responseData(vaultClientResult.getResponseData())
                            .index(request.getIndex()).build()
                    );
                    isTokenFound = true;
                    break;
                }
            }

            if(!isTokenFound) {
                invalidVaultId.add(request.getToken());
            }
        }

        if (tokenSearchRequests.size() != vaultResponseList.size()) {
            throw new DataNotFoundException(ErrorEntityCodes.DATA_NOT_FOUND,
                    "Invalid Tokens are" + invalidVaultId.toString());
        }
        return vaultResponseList;
    }


    @Override
    public List<VaultResponse> buildVaultResponses(List<VaultRequest> vaultRequests, VaultClientResponse response) {
        var vaultResponseList = new ArrayList<VaultResponse>();
        var results = response.getResult();
        if (CollectionUtils.isNotEmpty(results)) {
            for (var vaultClientResult : results) {
                var vaultIndex = getIndexForVaultResponses(vaultRequests, vaultClientResult);
                if (vaultIndex >= 0) {
                    vaultResponseList.add(new VaultResponse(vaultClientResult.getResponseData(), vaultIndex));
                }
            }
        }
        return vaultResponseList;
    }

    @Override
    public List<TokenResponse> buildResponsesForTokens(List<TokenRequest> tokenRequests, VaultClientResponse response)
            throws VaultServiceException {
        List<TokenResponse> tokenResponses = new ArrayList<>();
        List<VaultClientResult> results = response.getResult();
        Set<String> invalidVaultId = new HashSet<String>();
        boolean tokenFound = false;


        if (results == null) {
            throw new DataNotFoundException(ErrorEntityCodes.DATA_NOT_FOUND);
        }
        //To take care of duplicate:
        for (TokenRequest request : tokenRequests) {
            tokenFound = false;
            for (VaultClientResult vaultClientResult : results) {

                if(request.getData().trim().equals(vaultClientResult.getRequestData())){
                    tokenResponses.add(new TokenResponse(vaultClientResult.getResponseData(), request.getIndex()));
                    tokenFound = true;
                    break;
                }
            }

            if(!tokenFound) {
                invalidVaultId.add(request.getData());
            }
        }

        if(tokenRequests.size() != tokenResponses.size()){
            throw new DataNotFoundException(ErrorEntityCodes.DATA_NOT_FOUND,
                    "Invalid VaultId are" + invalidVaultId.toString());
        }
        return tokenResponses;
    }

    @Override
    public List<TokenResponse> buildResponsesForTokenEntries(List<VaultRequest> vaultRequests, VaultClientResponse response)
            throws VaultServiceException {
        List<TokenResponse> tokenResponses = new ArrayList<>();
        List<VaultClientResult> results = response.getResult();
        Set<String> invalidData = new HashSet<String>();
        boolean tokenFound = false;

        if (results == null) {
            throw new DataNotFoundException(ErrorEntityCodes.DATA_NOT_FOUND);
        }

        //To take care of duplicate:
        for (VaultRequest request : vaultRequests) {
            tokenFound = false;
            for (VaultClientResult vaultClientResult : results) {

                if(request.getPlaintext().trim().equals(vaultClientResult.getRequestData())){
                    tokenResponses.add(new TokenResponse(vaultClientResult.getResponseData(), request.getIndex()));
                    tokenFound = true;
                    break;
                }
            }

            if(!tokenFound) {
                invalidData.add(request.getPlaintext());
            }
        }

        if (vaultRequests.size() != tokenResponses.size()) {
            throw new DataNotFoundException(ErrorEntityCodes.DATA_NOT_FOUND,
                    "Invalid data are" + invalidData.toString());
        }
        return tokenResponses;
    }



    private Integer getIndexForVaultResponses(List<VaultRequest> vaultRequests, VaultClientResult vaultClientResult) {
        return vaultRequests.stream().filter(vaultRequest -> vaultClientResult.getRequestData()
                .equals(vaultRequest.getPlaintext().trim()))
                .findAny()
                .get()
                .getIndex();
    }


    private void getInvalidVaultIdsForVaultSearch(List<SearchResponse> vaultResponseList, List<VaultSearchRequest> vaultSearchRequests){
        for (VaultSearchRequest vaultSearchRequest : vaultSearchRequests) {
            if (!vaultResponseList.contains(vaultSearchRequest.getVaultId())) {
                vaultResponseList.add(SearchResponse.builder()
                        .responseData(ErrorEntityMessage.INVALID_VAULT_ID_MESSAGE + ":" + vaultSearchRequest.getVaultId())
                        .index(vaultSearchRequest.getIndex())
                        .build()
                );
            }
        }
    }
}
