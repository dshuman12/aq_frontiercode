package com.gap.customer.vaultservice.services.Impl;

import com.gap.customer.vaultservice.models.*;
import com.gap.customer.vaultservice.services.VaultClientRequestBuilder;
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
public class VaultClientRequestBuilderImplTest {


    @Mock
    private VaultClientRequest vaultClientRequest;


    private VaultClientRequestBuilder vaultClientRequestBuilder;

    @Before
    public void setup(){
        vaultClientRequestBuilder = new VaultClientRequestBuilderImpl();
    }


    @Test
    public void testbuildVaultClientRequestsForVaultEntries() {
        List<VaultRequest> vaultRequestList = new ArrayList<>();
        vaultRequestList.add(VaultRequest.builder()
                .type("CREDIT_CARD_EXPIRY_YEAR")
                .index(0).plaintext("2019")
                .build());
        vaultClientRequest = vaultClientRequestBuilder.buildVaultClientRequestsForVaultEntries(vaultRequestList);
        Assert.assertEquals("CreditCardExpiryYear", vaultClientRequest.getRequestFormat() );
    }

    @Test
    public void testbuildVaultClientRequestForTokenEntries() {
        List<VaultRequest> vaultRequestList =  new ArrayList<>();
        vaultRequestList.add(VaultRequest.builder()
                .type("CREDIT_CARD_NUMBER")
                .index(0)
                .plaintext("4479951709255127")
                .build());
        vaultClientRequest = vaultClientRequestBuilder.buildVaultClientRequestForTokenEntries(vaultRequestList);
        Assert.assertEquals("Token", vaultClientRequest.getResponseFormat());
    }

    @Test
    public void testbuildVaultClientRequestForVaultSearch() {
        List<VaultSearchRequest> vaultSearchRequestList =  new ArrayList<>();
        vaultSearchRequestList.add(VaultSearchRequest.builder()
                .returnType("CREDIT_CARD_EXPIRY_YEAR")
                .index(0)
                .vaultId("AD5302CBC74D5F0DB8D9D12CF45788F9")
                .build());
        vaultClientRequest =  vaultClientRequestBuilder.buildVaultClientRequestForVaultSearch(vaultSearchRequestList);
        Assert.assertEquals("AD5302CBC74D5F0DB8D9D12CF45788F9", vaultClientRequest.getRequestData()[0]);
    }

    @Test
    public void buildVaultClientRequestsForTokenSearch(){
        List<TokenSearchRequest> tokenSearchRequestList =  new ArrayList<>();
        tokenSearchRequestList.add(TokenSearchRequest.builder()
                .returnType("VAULT_ID")
                .index(0)
                .token("4558648846903826")
                .build());
        vaultClientRequest = vaultClientRequestBuilder.buildVaultClientRequestsForTokenSearch(tokenSearchRequestList);
        Assert.assertEquals("VaultId", vaultClientRequest.getResponseFormat());
    }


    @Test
    public void testbuildVaultClientRequestForTokens(){
        List<TokenRequest> tokenRequestList =  new ArrayList<>();
        tokenRequestList.add(TokenRequest.builder()
                                        .type("VAULT_ID")
                                        .index(0)
                                        .data("E4E7B12EA55B99BB3C21738E22EFE6F7").build());
        vaultClientRequest = vaultClientRequestBuilder.buildVaultClientRequestForTokens(tokenRequestList);
        Assert.assertEquals("VaultId", vaultClientRequest.getRequestFormat());

    }

}
