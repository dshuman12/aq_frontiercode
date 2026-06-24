package com.gap.customer.vaultservice.filters;

import com.gap.customer.vaultservice.controller.TraceHeaders;
import com.gap.customer.vaultservice.exception.ValidationException;
import com.gap.customer.vaultservice.models.VaultDataScopeConfig;
import com.gap.customer.vaultservice.models.VaultSearchRequest;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Disabled;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.junit.jupiter.SpringExtension;

import javax.servlet.http.HttpServletRequest;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@ExtendWith(SpringExtension.class)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
public class VaultDataScopeFilterTest {



    @Mock
    private VaultDataScopeConfig vaultDataScopeConfig;

    private VaultDataScopeFilter vaultDataScopeFilter;

    @Mock
    private HttpServletRequest httpServletRequest;

    @BeforeEach
    public void setUp() {
        vaultDataScopeFilter = new VaultDataScopeFilter(vaultDataScopeConfig);
    }

    @Test
    public void testDataScopesList(){
        String dataScope = "creditcard, giftcard, token";
        List<String>  dataScopeList = Arrays.asList(dataScope.split(","));
        Assertions.assertEquals(3, dataScopeList.size());

    }

    @Test
    public void testDataScopesListContainsCreditCard(){
        String dataScope = "creditcard,giftcard,token";
        List<String>  dataScopeList = Arrays.asList(dataScope.split(","));
        Assertions.assertEquals(true, dataScopeList.contains("creditcard"));

    }

    @Test
    public void testDataScopesListContainsGiftCard(){
        String dataScope = "creditcard,giftcard,token";
        List<String>  dataScopeList = Arrays.asList(dataScope.split(","));
        Assertions.assertEquals(true, dataScopeList.contains("giftcard"));

    }

    @Test
    public void testDataScopesListContainsToken(){
        String dataScope = "creditcard,giftcard,token";
        List<String>  dataScopeList = Arrays.asList(dataScope.split(","));
        Assertions.assertEquals(true, dataScopeList.contains("token"));
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
        Assertions.assertEquals(1,  filteredList.size());


    }



    @Test
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
        Assertions.assertThrows(ValidationException.class, () -> {
            vaultDataScopeFilter.lookupRequestsWithFilter(filteredList, vaultSearchRequestList);
        });

    }

    @Test
    @Disabled
    public void testfilterLookUpVaultSearchFilter() throws ValidationException {
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
        httpServletRequest.setAttribute("x-apigee-scopes","giftCard,creditcard,token");
        vaultDataScopeFilter.lookUpVaultSearchFilter(vaultSearchRequestList,httpServletRequest);
        Assertions.assertEquals(1,  filteredList.size());
    }

    private Map<String, String> getHeadersFromRequest(HttpServletRequest request) {

        Map<String, String> headers = new HashMap<>();
        if (request.getRemoteAddr() != null) {
            headers.put(TraceHeaders.X_FORWARDED_FOR, request.getRemoteAddr());
        }
        if (request.getHeader(TraceHeaders.X_GID_CLIENT_SESSION) != null) {
            headers.put(TraceHeaders.X_GID_CLIENT_SESSION, request.getHeader(TraceHeaders.X_GID_CLIENT_SESSION));
        }
        if (request.getHeader(TraceHeaders.X_APP_NAME) != null) {
            headers.put(TraceHeaders.X_APP_NAME, request.getHeader(TraceHeaders.X_APP_NAME));
        }
        if (request.getHeader(TraceHeaders.X_PREVIEW_HEADER) != null) {
            headers.put(TraceHeaders.X_PREVIEW_HEADER, request.getHeader(TraceHeaders.X_PREVIEW_HEADER));
        }
        if (request.getHeader(TraceHeaders.X_PREVIEW_HEADER) != null) {
            headers.put(TraceHeaders.X_PREVIEW_HEADER, request.getHeader(TraceHeaders.X_PREVIEW_HEADER));
        }

        return headers;
    }



}
