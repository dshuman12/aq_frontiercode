package com.gap.gid.tests.dao;

import com.gap.customer.vaultservice.VaultServiceApplication;
import com.gap.customer.vaultservice.models.Token;
import com.gap.customer.vaultservice.exception.DAOException;
import com.gap.customer.vaultservice.repository.azureSql.TokenRepository;
import com.gap.gid.tests.VaultServiceBaseTest;
import lombok.extern.slf4j.Slf4j;
import org.junit.Assert;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.test.context.junit4.SpringJUnit4ClassRunner;

import java.util.ArrayList;
import java.util.List;

@RunWith(SpringJUnit4ClassRunner.class)
@ComponentScan
@SpringBootTest(properties = {"server.port=9000"},
        classes = {VaultServiceApplication.class},
        webEnvironment = SpringBootTest.WebEnvironment.DEFINED_PORT)
@Slf4j
public class TokenTest extends VaultServiceBaseTest {

    public static final String VALID_TOKEN = "8569684286696103";

    @Autowired
    private Token token;

    @Autowired
    private TokenRepository tokenRepository;


    @Test
    public void testGetAllByVaultIds() throws DAOException {
        List<String > tokenVaultIdList = new ArrayList<>();
        tokenVaultIdList.add("CF72D21EB09B72067798AB89DCA45865");
        tokenVaultIdList.add("9142D58E13FA7F45F66188011D9C8D8C");
        tokenVaultIdList.add("9142D58E13FA7F45F66188011D9C8114");
        List<Token> vaultList = (List<Token>) tokenRepository.getAllByVaultIDs(tokenVaultIdList);
        Assert.assertEquals(2, vaultList.size());
    }

    @Test
    public void testTokenGetByValueforInvalidToken() throws DAOException {
        String invalidToken =  generateSecuredData();
        Token token = this.token.getByValue(invalidToken);
        Assert.assertNull(token);
    }

    @Test
    public void testTokenGetByValueforValidToken() throws DAOException {
        String validToken = VALID_TOKEN;
        Token token = this.token.getByValue(validToken);
        Assert.assertEquals(token.getValue(), validToken);
    }
}
