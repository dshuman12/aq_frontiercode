package com.gap.customer.vaultservice.services.Impl;


import com.gap.customer.vaultservice.models.*;
import com.gap.customer.vaultservice.services.VaultClientRequestBuilder;
import com.gap.customer.vaultservice.util.VaultConstants;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.*;

@Slf4j
@Component
public class VaultClientRequestBuilderImpl implements VaultClientRequestBuilder {

    private static final Map<String, String> requestTypeMap = createRequestTypeMap();

    private static Map<String, String> createRequestTypeMap() {
        Map<String, String> formatTypeMap = new HashMap<>();
        formatTypeMap.put("CREDIT_CARD_NUMBER", "CreditCardNumber");
        formatTypeMap.put("GIFT_CARD_NUMBER", "GiftCardNumber");
        formatTypeMap.put("GIFT_CARD_PIN", "GiftCardPin");
        formatTypeMap.put("CREDIT_CARD_EXPIRY_YEAR", "CreditCardExpiryYear");
        formatTypeMap.put("CREDIT_CARD_EXPIRY_MONTH", "CreditCardExpiryMonth");
        formatTypeMap.put("GIFT_CARD_TRACK2", "GiftCardTrack2");
        formatTypeMap.put("PASSWORD", "Password");
        formatTypeMap.put("VAULT_ID", "VaultId");
        formatTypeMap.put("TOKEN", "Token");
        return Collections.unmodifiableMap(formatTypeMap);
    }


    public VaultClientRequest buildVaultClientRequestForVaultSearch(List<VaultSearchRequest> vaultSearchRequests) {
        return VaultClientRequest.builder()
                .responseFormat(requestTypeMap.get(vaultSearchRequests.get(0).getReturnType()))
                .requestFormat(requestTypeMap.get(VaultConstants.DATA_TYPE_VAULT_ID))
                .requestData(setVaultIdsList(vaultSearchRequests))
                .build();
    }

    public VaultClientRequest buildVaultClientRequestsForTokenSearch(List<TokenSearchRequest> tokenSearchRequests) {
        return VaultClientRequest.builder()
                .responseFormat(requestTypeMap.get(tokenSearchRequests.get(0).getReturnType()))
                .requestFormat(VaultConstants.DATA_TYPE_TOKEN_SEARCH)
                .requestData(setTokensList(tokenSearchRequests))
                .build();
    }

    public VaultClientRequest buildVaultClientRequestsForVaultEntries(List<VaultRequest> vaultRequests) {
        return VaultClientRequest.builder()
                .requestFormat(requestTypeMap.get(vaultRequests.get(0).getType()))
                .responseFormat(requestTypeMap.get(VaultConstants.DATA_TYPE_VAULT_ID))
                .requestData(setPlainTextDataList(vaultRequests))
                .build();
    }

    public VaultClientRequest buildVaultClientRequestForTokens(List<TokenRequest> tokenRequests) {
        return VaultClientRequest.builder()
                .requestFormat(requestTypeMap.get(tokenRequests.get(0).getType()))
                .responseFormat(requestTypeMap.get(VaultConstants.DATA_TYPE_TOKEN))
                .requestData(setTokenDataList(tokenRequests))
                .build();
    }

    public VaultClientRequest buildVaultClientRequestForTokenEntries(List<VaultRequest> vaultRequests) {
        return VaultClientRequest.builder()
                .requestFormat(requestTypeMap.get(vaultRequests.get(0).getType()))
                .responseFormat(requestTypeMap.get(VaultConstants.DATA_TYPE_TOKEN))
                .requestData(setPlainTextDataList(vaultRequests))
                .build();
    }

    private String[] setVaultIdsList(List<VaultSearchRequest> vaultSearchRequests) {
        return vaultSearchRequests.stream()
                .map(VaultSearchRequest::getVaultId)
                .toArray(String[]::new);
    }

    private String[] setTokensList(List<TokenSearchRequest> tokenSearchRequests) {
        return tokenSearchRequests.stream()
                .map(TokenSearchRequest::getToken)
                .toArray(String[]::new);
    }


    private String[] setTokenDataList(List<TokenRequest> tokenRequests) {
        return tokenRequests.stream()
                .map(TokenRequest::getData)
                .toArray(String[]::new);

    }

    private String[] setPlainTextDataList(List<VaultRequest> vaultRequests) {
        return vaultRequests.stream()
                .map(VaultRequest::getPlaintext)
                .toArray(String[]::new);
    }
}
