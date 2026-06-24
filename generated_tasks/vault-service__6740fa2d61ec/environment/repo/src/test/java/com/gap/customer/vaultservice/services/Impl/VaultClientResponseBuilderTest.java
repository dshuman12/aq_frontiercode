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
public class VaultClientResponseBuilderTest {


    @Mock
    private VaultClientResponse vaultClientResponse;

    private VaultClientResponseBuilder vaultClientResponseBuilder;

    @Before
    public void setup() {
        vaultClientResponseBuilder = new VaultClientResponseBuilderImpl();

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





