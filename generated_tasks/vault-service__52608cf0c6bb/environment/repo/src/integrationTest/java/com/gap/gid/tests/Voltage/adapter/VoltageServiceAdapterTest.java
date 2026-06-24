package com.gap.gid.tests.Voltage.adapter;

import com.gap.customer.vaultservice.VaultServiceApplication;
import com.gap.gid.security.adapter.dto.TokenDTO;
import com.gap.gid.security.adapter.voltage.VoltageClient;
import com.gap.gid.security.adapter.voltage.VoltageServiceAdapter;
import com.gap.gid.tests.VaultServiceBaseTest;
import lombok.extern.slf4j.Slf4j;
import org.junit.Assert;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.test.context.junit4.SpringJUnit4ClassRunner;


@RunWith(SpringJUnit4ClassRunner.class)
@ComponentScan
@SpringBootTest(properties = {"server.port=9000"},
        classes = {VaultServiceApplication.class},
        webEnvironment = SpringBootTest.WebEnvironment.DEFINED_PORT)
@Slf4j
public class VoltageServiceAdapterTest extends VaultServiceBaseTest {

    @Autowired
    private VoltageClient voltageClient;
    private String tokenizedResult;
    private VoltageServiceAdapter voltageServiceAdapter;

    @Before
    public void setup(){
        voltageServiceAdapter = new VoltageServiceAdapter(voltageClient);
    }

    @Test
    public void testTokenize(){
       String securedData =  getSecuredInputData();
       TokenDTO  tokenDTO = voltageServiceAdapter.tokenize(securedData);
       tokenizedResult = tokenDTO.getToken();
       Assert.assertEquals(securedData, tokenDTO.getInputValue());
    }
}
