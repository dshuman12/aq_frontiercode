package com.gap.customer.vaultservice.filters;

import com.gap.customer.vaultservice.exception.ValidationException;
import com.gap.customer.vaultservice.models.VaultDataScopeConfig;
import com.gap.customer.vaultservice.models.VaultSearchRequest;
import org.junit.Assert;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;

import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.mockito.junit.MockitoJUnitRunner;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@RunWith(MockitoJUnitRunner.class)
public class VaultDataScopeFilterTest {



    @Mock
    private VaultDataScopeConfig vaultDataScopeConfig;

    private VaultDataScopeFilter vaultDataScopeFilter;

    @Before
    public void setUp() {
        vaultDataScopeFilter = new VaultDataScopeFilter(vaultDataScopeConfig);
    }

    @Test
    public void testDataScopesList(){
        String dataScope = "creditcard, giftcard, token";
        List<String>  dataScopeList = Arrays.asList(dataScope.split(","));
        Assert.assertEquals(3, dataScopeList.size());

    }

    @Test
    public void testDataScopesListContainsCreditCard(){
        String dataScope = "creditcard,giftcard,token";
        List<String>  dataScopeList = Arrays.asList(dataScope.split(","));
        Assert.assertEquals(true, dataScopeList.contains("creditcard"));

    }

    @Test
    public void testDataScopesListContainsGiftCard(){
        String dataScope = "creditcard,giftcard,token";
        List<String>  dataScopeList = Arrays.asList(dataScope.split(","));
        Assert.assertEquals(true, dataScopeList.contains("giftcard"));

    }

    @Test
    public void testDataScopesListContainsToken(){
        String dataScope = "creditcard,giftcard,token";
        List<String>  dataScopeList = Arrays.asList(dataScope.split(","));
        Assert.assertEquals(true, dataScopeList.contains("token"));
    }

    @Test
    public void testfilterDataScopeLookup() throws ValidationException {
        List<VaultSearchRequest> vaultSearchRequestList =  new ArrayList<>();
        vaultSearchRequestList.add(VaultSearchRequest.builder()
                .returnType("CREDIT_CARD_EXPIRY_YEAR")
                .index(0)
                .vaultId("AD5302CBC74D5F0DB8D9D12CF45788F9")
                .build());

        vaultSearchRequestList.add(VaultSearchRequest.builder()
                .returnType("CREDIT_CARD_EXPIRY_YEAR")
                .index(1)
                .vaultId("AD5302CBC74D5F0DB8D9D12CF4578889")
                .build());
        List<String> filteredList = new ArrayList<>();
        filteredList.add("CREDIT_CARD_EXPIRY_YEAR");
        vaultDataScopeFilter.lookupRequestsWithFilter(filteredList, vaultSearchRequestList);
        Assert.assertEquals(1,  filteredList.size());


    }



    @Test(expected = ValidationException.class)
    public void testfilterDataScopeLookupFalse() throws ValidationException {
        List<VaultSearchRequest> vaultSearchRequestList =  new ArrayList<>();
        vaultSearchRequestList.add(VaultSearchRequest.builder()
                .returnType("CREDIT_CARD_EXPIRY_MONTH")
                .index(0)
                .vaultId("AD5302CBC74D5F0DB8D9D12CF45788F9")
                .build());

        vaultSearchRequestList.add(VaultSearchRequest.builder()
                .returnType("CREDIT_CARD_EXPIRY_MONTH")
                .index(1)
                .vaultId("AD5302CBC74D5F0DB8D9D12CF4578889")
                .build());
        List<String> filteredList = new ArrayList<>();
        filteredList.add("CREDIT_CARD_EXPIRY_YEAR");
       vaultDataScopeFilter.lookupRequestsWithFilter(filteredList, vaultSearchRequestList);

    }


}
