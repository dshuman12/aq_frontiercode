package com.gap.gid.tests.security;


/*

@RunWith(SpringJUnit4ClassRunner.class)
@ComponentScan
@SpringBootTest(properties = {"server.port=9000"},
        classes = {VaultServiceApplication.class},
        webEnvironment = SpringBootTest.WebEnvironment.DEFINED_PORT)
@Slf4j
public class CipherManagerTest extends VaultServiceBaseTest {

    @Autowired
    private DataTypeDAO dataTypeDAO;

    @Autowired
    private DataTypeKeyDataDAO dataTypeKeyDataDAO;

    @Autowired
    private DataTypeRepository dataTypeRepository;

    @Autowired
    private DataTypeKeyDataRepository dataTypeKeyDataRepository;

    @Autowired
    @Qualifier("ingrianProps")
    private Properties ingrainProps;

    @Autowired
    @Qualifier("serverProps")
    private Properties serverProps;

    private CipherClientImpl cipherManager;
    private Random random;


    @Before
    public void setup() {
        cipherManager = CipherClientImpl.getInstance(dataTypeDAO, dataTypeKeyDataDAO, dataTypeRepository, dataTypeKeyDataRepository, ingrainProps, serverProps);
        random = new Random();
    }

    @Test
    public void testIngrainProperties() {
        String result = cipherManager.testIngrianConnection();
        Assert.assertEquals("up", result);
    }

    @Test
    public void testGetDataTypeKeyData() throws DAOException, VaultServiceException {
        DataTypeKeyDataResultDTO typeKeyData = cipherManager.getDataTypeKeyData(VaultTestConstants.CREDIT_CARD_NUMBER_LEG);
        DataTypeResultDTO result = typeKeyData.getDataType();
        Assert.assertEquals("CreditCardNumber", result.getDataTypeName());
    }

    @Test
    public void testCipherMangerData() throws DAOException, VaultServiceException, BadPaddingException,
            IllegalBlockSizeException {
        int upperBound = 12;
        String month = String.valueOf(random.nextInt(upperBound));
        DataTypeKeyDataResultDTO typeKeyData = cipherManager.getDataTypeKeyData(VaultTestConstants.CREDIT_CARD_EXPIRY_MON_LEG);
        byte[] cipherText = cipherManager.getCipherText(month, typeKeyData);
        String result = cipherManager.getClearText(cipherText, typeKeyData);
        Assert.assertEquals(month, result);
    }

 */
