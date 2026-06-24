package com.gap.customer.vaultservice.services.Impl;

import com.gap.customer.vaultservice.exception.DataNotFoundException;
import com.gap.customer.vaultservice.exception.VaultServiceException;
import com.gap.customer.vaultservice.models.*;
import com.gap.customer.vaultservice.services.VaultClientResponseBuilder;
import org.junit.Assert;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.mockito.junit.MockitoJUnitRunner;

import java.util.ArrayList;
import java.util.List;

@RunWith(MockitoJUnitRunner.class)
public class VaultClientResponseBuilderImplTest {


    @Mock
    private VaultClientResponse vaultClientResponse;

    private VaultClientResponseBuilder vaultClientResponseBuilder;

    @Before
    public void setup() {
        vaultClientResponseBuilder = new VaultClientResponseBuilderImpl();

    }

    @Test
    public void testbuildResponseForVaultSearch() throws VaultServiceException {
     List<VaultSearchRequest> vaultSearchRequestList =  new ArrayList<>();
     vaultSearchRequestList.add(VaultSearchRequest.builder()
     .returnType("TOKEN")
     .index(0)
     .vaultId("51940520004144A2FA626C91168307A8").build());
     ArrayList<VaultClientResult> vaultClientResultList =  new ArrayList<>();
     vaultClientResultList.add(VaultClientResult.builder()
                .responseData("4558648846903826")
                .requestData("51940520004144A2FA626C91168307A8")
                .build());
     vaultClientResponse = VaultClientResponse.builder()
                .responseFormat("Token")
                .requestFormat("VaultId")
                .result(vaultClientResultList)
                .build();
     List<SearchResponse> vaultSearchResponses = vaultClientResponseBuilder.buildResponsesForVaultSearch(vaultSearchRequestList, vaultClientResponse);
     Assert.assertEquals("4558648846903826", vaultSearchResponses.get(0).getResponseData());
    }

    @Test
    public void testbuildResponseForVaultEntries() throws VaultServiceException {
        List<VaultRequest> vaultRequestList = new ArrayList<>();
        vaultRequestList.add(VaultRequest.builder()
        .type("CREDIT_CARD_NUMBER")
        .index(0)
        .plaintext("4479951709255127").build());
        ArrayList<VaultClientResult> vaultClientResultList =  new ArrayList<>();
        vaultClientResultList.add(VaultClientResult.builder()
        .requestData("4479951709255127")
        .responseData("BC89A9092A08A2E04BC9A9427114F097").build());
        vaultClientResponse = VaultClientResponse.builder()
                .responseFormat("VaultId")
                .requestFormat("CreditCardNumber")
                .result(vaultClientResultList)
                .build();

       List<VaultResponse> vaultResponses = vaultClientResponseBuilder.buildVaultResponses(vaultRequestList, vaultClientResponse);
       Assert.assertEquals("BC89A9092A08A2E04BC9A9427114F097", vaultResponses.get(0).getVaultId());

    }

    @Test
    public void testbuildResponseForTokenEntries() throws VaultServiceException {
        List<VaultRequest> vaultRequestList = new ArrayList<>();
        vaultRequestList.add(VaultRequest.builder()
                .type("CREDIT_CARD_NUMBER")
                .index(0)
                .plaintext("4479951709255127").build());
        ArrayList<VaultClientResult> vaultClientResultList =  new ArrayList<>();
        vaultClientResultList.add(VaultClientResult.builder()
                .requestData("4479951709255127")
                .responseData("4479953958875127").build());

        vaultClientResponse = VaultClientResponse.builder()
                .responseFormat("Token")
                .requestFormat("CreditCardNumber")
                .result(vaultClientResultList)
                .build();

        List<TokenResponse> tokenResponses = vaultClientResponseBuilder.buildResponsesForTokenEntries(vaultRequestList, vaultClientResponse);
        Assert.assertEquals("4479953958875127", tokenResponses.get(0).getToken());

    }

    @Test
    public void testbuildResponseForTokenEntriesSearch() throws VaultServiceException {
      List<TokenSearchRequest> tokenSearchRequestList =  new ArrayList<>();
      tokenSearchRequestList.add(TokenSearchRequest.builder()
      .returnType("VAULT_ID")
      .index(0)
      .token("4558648846903826").build());
      ArrayList<VaultClientResult> vaultClientResultList =  new ArrayList<>();
      vaultClientResultList.add(VaultClientResult.builder()
      .requestData("4558648846903826")
      .responseData("51940520004144A2FA626C91168307A8")
      .build());
      vaultClientResponse = VaultClientResponse.builder()
                .responseFormat("VaultId")
                .requestFormat("Token")
                .result(vaultClientResultList)
                .build();
      List<SearchResponse> tokenSearchResponses = vaultClientResponseBuilder.buildResponsesForTokenSearch(tokenSearchRequestList, vaultClientResponse);
      Assert.assertEquals("51940520004144A2FA626C91168307A8", tokenSearchResponses.get(0).getResponseData());
    }

    @Test
    public void testbuildResponsesForTokens() throws VaultServiceException {
        List<TokenRequest> tokenRequestList = new ArrayList<>();
        tokenRequestList.add(TokenRequest.builder()
                .type("VAULT_ID")
                .index(0)
                .data("E4E7B12EA55B99BB3C21738E22EFE6F7").build());
        ArrayList<VaultClientResult> vaultClientResultList = new ArrayList<>();
        vaultClientResultList.add(VaultClientResult.builder()
                .requestData("E4E7B12EA55B99BB3C21738E22EFE6F7")
                .responseData("4988697034836355")
                .build());
        vaultClientResponse = VaultClientResponse.builder()
                .responseFormat("Token")
                .requestFormat("VaultId")
                .result(vaultClientResultList)
                .build();
        List<TokenResponse> tokenResponses = vaultClientResponseBuilder.buildResponsesForTokens(tokenRequestList, vaultClientResponse);
        Assert.assertEquals("4988697034836355", tokenResponses.get(0).getToken());
    }


    @Test(expected = DataNotFoundException.class)
    public void testbuildResponsesForTokenswithException() throws VaultServiceException {
        List<TokenRequest> tokenRequestList = new ArrayList<>();
        tokenRequestList.add(TokenRequest.builder()
                .type("VAULT_ID")
                .index(0)
                .data("E4E7B12EA55B99BB3C21738E22EFE6F7").build());
        ArrayList<VaultClientResult> vaultClientResultList = new ArrayList<>();
        vaultClientResponse = VaultClientResponse.builder()
                .responseFormat("Token")
                .requestFormat("VaultId")
                .result(vaultClientResultList)
                .build();
        List<TokenResponse> tokenResponses = vaultClientResponseBuilder.buildResponsesForTokens(tokenRequestList, vaultClientResponse);
    }
}





