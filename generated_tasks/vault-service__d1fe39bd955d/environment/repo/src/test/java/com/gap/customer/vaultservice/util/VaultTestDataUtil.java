package com.gap.customer.vaultservice.util;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gap.customer.vaultservice.models.*;
import com.gap.gid.security.adapter.dto.TokenDTO;
import org.assertj.core.util.Lists;

import java.util.ArrayList;
import java.util.List;

public class VaultTestDataUtil {


    public static List<VaultRequest> buildRequestForPostVaultEntries() {
        VaultRequest vaultRequestCreditCard= VaultRequest.builder().type("CREDIT_CARD_NUMBER").index(0).plaintext("4111111111111111").build();
        VaultRequest vaultGiftCard= VaultRequest.builder().type("GIFT_CARD_NUMBER").index(1).plaintext("4111111111111112").build();
        VaultRequest vaultGiftCardPin= VaultRequest.builder().type("GIFT_CARD_PIN").index(2).plaintext("4563242334532424").build();
        VaultRequest vaultCreditCardExpiryMonth= VaultRequest.builder().type("GIFT_CARD_PIN").index(3).plaintext("12").build();
        VaultRequest vaultCreditCardExpiryYear= VaultRequest.builder().type("CREDIT_CARD_EXPIRY_YEAR").index(4).plaintext("2022").build();
        return Lists.newArrayList(vaultRequestCreditCard,vaultGiftCard,vaultGiftCardPin,
                vaultCreditCardExpiryMonth,vaultCreditCardExpiryYear);
    }

    public static List<VaultResponse> buildResponsesForPostVaultEntries() {
        VaultResponse vaultResponseCreditCard= VaultResponse.builder().vaultId("5AB65057E00654BA67C937416290D36F").index(0).build();
        VaultResponse vaultResponseGiftCard=VaultResponse.builder().vaultId("6AB65057E00654BA67C937416290D36F").index(1).build();
        VaultResponse vaultResponseGiftCardPin= VaultResponse.builder().vaultId("7AB65057E00654BA67C937416290D36F").index(2).build();
        VaultResponse vaultResponseCardExpiryMonth= VaultResponse.builder().vaultId("8AB65057E00654BA67C937416290D36F").index(3).build();
        VaultResponse vaultResponseCreditCardExpiryYear= VaultResponse.builder().vaultId("9AB65057E00654BA67C937416290D36F").index(4).build();
        return Lists.newArrayList(vaultResponseCreditCard,vaultResponseGiftCard,
                vaultResponseGiftCardPin,vaultResponseCardExpiryMonth,vaultResponseCreditCardExpiryYear);
    }


    public static List<SearchResponse> builVaultEntryResponsesForGetVaultEntries() {
        SearchResponse vaultEntryResponseForVaultId=  SearchResponse.builder().responseData("6AB65057E00654BA67C937416290D36F").index(0).build();
        SearchResponse vaultEntryResponseForCardExpYr= SearchResponse.builder().responseData("2022").index(1).build();
        SearchResponse vaultEntryResponseCardForExpMonth=  SearchResponse.builder().responseData("12").index(2).build();
        SearchResponse vaultEntryResponseForGiftCard=  SearchResponse.builder().responseData("4111111111111112").index(3).build();
        SearchResponse vaultEntryResponseForGiftCardPin=  SearchResponse.builder().responseData("4563242334532424").index(4).build();
        SearchResponse vaultEntryResponseForToken=  SearchResponse.builder().responseData("12341234123412").index(5).build();
        return Lists.newArrayList(vaultEntryResponseForVaultId,vaultEntryResponseForCardExpYr,vaultEntryResponseCardForExpMonth,
                vaultEntryResponseForGiftCard,vaultEntryResponseForGiftCardPin,vaultEntryResponseForToken);
    }

    public static VaultClientResponse getVaultSearchTokenResponse() {
        var vaultClientResults = new ArrayList<VaultClientResult>();
        vaultClientResults.add(VaultClientResult.builder().requestData("4479951709255127").responseData
                        ("5182169FDDEBDEFDAA307E5948B502DA")
                .build());
        vaultClientResults.add(VaultClientResult.builder().requestData("4489951947255128").responseData
                        ("B0CF82E099A4BD8B8BF8860D3288D938")
                .build());

        VaultClientResponse vaultClientResponse = VaultClientResponse.builder()
                .responseFormat(VaultConstants.DATA_TYPE_VAULT_ID)
                .requestFormat(VaultConstants.DATA_TYPE_TOKEN_SEARCH)
                .result(vaultClientResults)
                .build();


        return vaultClientResponse;
    }
    public static VaultClientRequest createVaultTokenSearchClientRequest(){
        List<TokenSearchRequest> tokenRequests = new ArrayList<>();
        TokenSearchRequest tokenRequest1 = TokenSearchRequest.builder()
                .returnType("VAULT_ID")
                .index(0)
                .token("4479951709255127")
                .build();

        TokenSearchRequest tokenRequest2 = TokenSearchRequest.builder()
                .returnType("VAULT_ID")
                .index(1)
                .token("4489951947255128")
                .build();

        tokenRequests.add(tokenRequest1);
        tokenRequests.add(tokenRequest2);

        VaultClientRequest vaultClientRequest = VaultClientRequest.builder()
                .responseFormat(VaultConstants.REQ_TYPE_VAULT_ID)
                .requestFormat(VaultConstants.DATA_TYPE_TOKEN)
                .requestData(setTokensList(tokenRequests))
                .build();


        return vaultClientRequest;
    }

    public static List<TokenSearchRequest> createTokenSearchRequest(){
        List<TokenSearchRequest> tokenRequests = new ArrayList<>();
        TokenSearchRequest tokenRequest1 = TokenSearchRequest.builder()
                .returnType("VAULT_ID")
                .index(0)
                .token("4479951709255127")
                .build();

        TokenSearchRequest tokenRequest2 = TokenSearchRequest.builder()
                .returnType("VAULT_ID")
                .index(1)
                .token("4489951947255128")
                .build();

        tokenRequests.add(tokenRequest1);
        tokenRequests.add(tokenRequest2);



        return tokenRequests;
    }

    public static List<TokenSearchRequest> createTokenSearchRequest(List<String> tokens){
        List<TokenSearchRequest> tokenRequests = new ArrayList<>();

        for(String token : tokens)
        {
            TokenSearchRequest tokenRequest = TokenSearchRequest.builder()
                    .returnType("VAULT_ID")
                    .index(0)
                    .token(token)
                    .build();
            tokenRequests.add(tokenRequest);

        }
        return tokenRequests;
    }


    private static String[] setTokensList(List<TokenSearchRequest> tokenSearchRequests) {
        return tokenSearchRequests.stream()
                .map(TokenSearchRequest::getToken)
                .toArray(String[]::new);
    }
    public static TokenDTO getTokenDTO(String token)
    {
        TokenDTO tokenDTO= new TokenDTO();
        tokenDTO.setToken(token);
        return tokenDTO;
    }

    public static String asJsonString(final Object object) {
        try {
            return new ObjectMapper().writeValueAsString(object);
        } catch (Exception e){
            throw new RuntimeException(e);
        }
    }
}
