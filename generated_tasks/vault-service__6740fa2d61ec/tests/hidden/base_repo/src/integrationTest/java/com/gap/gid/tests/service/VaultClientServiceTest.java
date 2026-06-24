package com.gap.gid.tests.service;

import com.gap.customer.vaultservice.VaultServiceApplication;
import com.gap.customer.vaultservice.exception.LegacyVaultServiceException;
import com.gap.customer.vaultservice.models.VaultClientRequest;
import com.gap.customer.vaultservice.models.VaultClientResponse;
import com.gap.customer.vaultservice.models.VaultFeatureToggle;
import com.gap.customer.vaultservice.services.VaultClientService;
import com.gap.gid.tests.VaultServiceBaseTest;
import com.gap.gid.tests.VaultTestConstants;
import lombok.extern.slf4j.Slf4j;
import org.junit.Assert;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.test.context.junit4.SpringJUnit4ClassRunner;
import java.util.HashMap;
import java.util.Map;


@RunWith(SpringJUnit4ClassRunner.class)
@ComponentScan
@SpringBootTest(properties = {"server.port=9000"},
        classes = {VaultServiceApplication.class},
        webEnvironment = SpringBootTest.WebEnvironment.DEFINED_PORT)
@Slf4j
public class VaultClientServiceTest extends VaultServiceBaseTest {

     @Autowired
     private VaultStrategyFactory vaultStrategyFactory;
     @Autowired
     private VaultFeatureToggle vaultFeatureToggle;
     @Autowired
     private VaultClientService vaultClientService;


    @Test
    public void testVaultClientServiceForPCF() throws LegacyVaultServiceException {
        String[] inputData = new String[] { getSecuredInputData()};
        vaultFeatureToggle.setLegacyEnabled(false);
        VaultClientRequest vaultClientRequest = VaultClientRequest.builder().requestFormat(VaultTestConstants.CREDIT_CARD_NUMBER_LEG)
                                                                             .responseFormat(VaultTestConstants.VAULT_ID_LEG).requestData(inputData).build();
        VaultClientResponse vaultClientResponse = vaultClientService.getVaultId(setRequestHeaders(), vaultClientRequest);
        Assert.assertEquals("VaultId", vaultClientResponse.getResponseFormat());
    }


    @Test(expected = LegacyVaultServiceException.class)
    public void testVaultClientServiceForPCFLegacy() throws LegacyVaultServiceException {
        String[] inputData = new String[] { getSecuredInputData() };
        vaultFeatureToggle.setLegacyEnabled(true);
        VaultClientRequest vaultClientRequest = VaultClientRequest.builder().requestFormat(VaultTestConstants.CREDIT_CARD_NUMBER_LEG)
                .responseFormat(VaultTestConstants.VAULT_ID_LEG).requestData(inputData).build();
        VaultClientResponse vaultClientResponse = vaultClientService.getVaultId(setRequestHeaders(), vaultClientRequest);
    }


    private Map<String, String> setRequestHeaders() {
       Map<String, String> headers = new HashMap<>();
       headers.put(VaultTestConstants.CONTENT_TYPE, VaultTestConstants.APPLICATION_JSON);
       headers.put(VaultTestConstants.ACCEPT,VaultTestConstants.APPLICATION_JSON);
       return headers;
    }

}
