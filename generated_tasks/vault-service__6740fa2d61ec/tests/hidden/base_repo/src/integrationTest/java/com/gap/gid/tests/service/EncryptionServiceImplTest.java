package com.gap.gid.tests.service;

import com.gap.customer.vaultservice.VaultServiceApplication;
//w
import com.gap.gid.tests.VaultServiceBaseTest;

import groovy.util.logging.Slf4j;
import org.junit.runner.RunWith;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.test.context.junit4.SpringJUnit4ClassRunner;


@RunWith(SpringJUnit4ClassRunner.class)
@ComponentScan
@SpringBootTest(properties = {"server.port=9000"},
        classes = {VaultServiceApplication.class},
        webEnvironment = SpringBootTest.WebEnvironment.DEFINED_PORT)
@Slf4j
public class EncryptionServiceImplTest extends VaultServiceBaseTest {


    /*private  EncryptionServiceImpl encryptionService;
    @Autowired
    private CipherManager cipherManager;
    @Autowired
    private UserContext userContext;

    @Before
    public void setup(){
        encryptionService = new EncryptionServiceImpl();
        encryptionService.setCipherManager(cipherManager);
        encryptionService.setUserContext(userContext);
    }

    @Test
    public void testStoreAndGetVaultId() throws RemoteException, VaultException {
        String securedMonth = getSecuredInputData();
        VaultID storedVaultId  = encryptionService.store(securedMonth, VaultTestConstants.GIFT_CARD_NUMBER_LEG);
        VaultID fetchVaultId = encryptionService.getVaultID(securedMonth, VaultTestConstants.GIFT_CARD_NUMBER_LEG);
        Assert.assertEquals(storedVaultId.getID(), fetchVaultId.getID());
    }

    @Test
    public void testRetrieve() throws RemoteException, VaultException  {
        String securedMonth = getSecuredMonth();
        VaultID vaultObj = encryptionService.store(securedMonth,  VaultTestConstants.CREDIT_CARD_EXPIRY_MON_LEG);
        String  retrievedResult  = encryptionService.retrieve(vaultObj);
        Assert.assertEquals(securedMonth, retrievedResult);
    }*/

}
