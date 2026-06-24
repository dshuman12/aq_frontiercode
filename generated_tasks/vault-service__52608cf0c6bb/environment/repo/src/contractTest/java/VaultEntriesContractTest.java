import au.com.dius.pact.provider.junit.Provider;
import au.com.dius.pact.provider.junit.State;
import au.com.dius.pact.provider.junit.loader.PactFolder;
import au.com.dius.pact.provider.junit5.HttpTestTarget;
import au.com.dius.pact.provider.junit5.PactVerificationContext;
import au.com.dius.pact.provider.junit5.PactVerificationInvocationContextProvider;
import com.gap.customer.vaultservice.VaultServiceApplication;
import com.gap.customer.vaultservice.models.VaultClientRequest;
import com.gap.customer.vaultservice.models.VaultClientResponse;
import com.gap.customer.vaultservice.models.VaultClientResult;
import com.gap.customer.vaultservice.models.VaultDataScopeConfig;
import com.gap.customer.vaultservice.models.VaultFeatureToggle;
import com.gap.customer.vaultservice.repository.azureSql.DataTypeKeyDataRepository;
import com.gap.customer.vaultservice.repository.azureSql.DataTypeRepository;
import com.gap.customer.vaultservice.repository.azureSql.EncryptedDataRepository;
import com.gap.customer.vaultservice.repository.azureSql.LookUpRepository;
import com.gap.customer.vaultservice.repository.azureSql.PasswordRepository;
import com.gap.customer.vaultservice.repository.azureSql.TokenRepository;
import com.gap.customer.vaultservice.security.CipherKeys;
import com.gap.customer.vaultservice.services.Impl.VaultClientResponseHelperImpl;
import com.gap.customer.vaultservice.util.VaultConstants;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.TestTemplate;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.boot.web.server.LocalServerPort;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.junit.jupiter.SpringExtension;

import java.util.ArrayList;

import static org.mockito.Mockito.any;
import static org.mockito.Mockito.when;

@ExtendWith(SpringExtension.class)
@Provider("vault-service-vault-entries-api")
@PactFolder("contracts")
@SpringBootTest(
        classes = {VaultServiceApplication.class},
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestPropertySource(value = "classpath:application-contract-tests.properties")

public class VaultEntriesContractTest {

    @MockBean
    TokenRepository tokenRepository;

    @MockBean
    DataTypeKeyDataRepository dataTypeKeyDataRepository;

    @MockBean
    DataTypeRepository dataTypeRepository;

    @MockBean
    PasswordRepository passwordRepository;

    @MockBean
    VaultClientResponseHelperImpl vaultClientResponseHelper;

    @MockBean
    private VaultDataScopeConfig vaultDataScopeConfig;

    @MockBean
    private EncryptedDataRepository encryptedDataRepository;

    @MockBean
    private LookUpRepository lookUpRepository;

    @MockBean
    private VaultFeatureToggle vaultFeatureToggle;

    @MockBean
    private CipherKeys cipherKeys;

    @LocalServerPort
    private int port;

    @TestTemplate
    @ExtendWith(PactVerificationInvocationContextProvider.class)
    void pactVerificationTestTemplate(PactVerificationContext context) {
        context.verifyInteraction();
    }

    @BeforeEach
    void before(PactVerificationContext context) {
        when(vaultFeatureToggle.isLegacyCloud()).thenReturn(false);
        context.setTarget(new HttpTestTarget("localhost", port));
    }

    @State("Create vault entries for valid GiftCardNumber")
    public void createVaultEntriesForValidGiftCardNumber() throws Exception {
        when(vaultClientResponseHelper.createVaultIdDataForEncryptedCard(any(VaultClientRequest.class), any()))
                .thenReturn(getVaultClientResponseForGiftCardNumber());
    }

    @State("Create vault entries for valid GiftCardPin")
    public void createVaultEntriesForValidGiftCardPin() throws Exception {
        when(vaultClientResponseHelper.createVaultIdDataForEncryptedCard(any(VaultClientRequest.class), any()))
                .thenReturn(getVaultClientResponseForGiftCardPin());
    }

    @State("Create vault entries for valid GiftCardTrack2")
    public void createVaultEntriesForValidGiftCardTrack2() throws Exception {
        when(vaultClientResponseHelper.createVaultIdDataForEncryptedCard(any(VaultClientRequest.class), any()))
                .thenReturn(getVaultClientResponseForGiftCardTrack2());
    }

    @State("Create vault entries for valid CreditCardNumber")
    public void createVaultEntriesForValidCreditCardNumber() throws Exception {
        when(vaultClientResponseHelper.createVaultIdDataForCreditCard(any(VaultClientRequest.class), any()))
                .thenReturn(getVaultClientResponseForCreditCardNumber());
    }

    @State("Create vault entries for valid CreditCardExpiryMonth")
    public void createVaultEntriesForValidCreditCardExpiryMonth() throws Exception {
        when(vaultClientResponseHelper.createVaultIdDataForEncryptedCard(any(VaultClientRequest.class), any()))
                .thenReturn(getVaultClientResponseForCreditCardExpiryMonth());
    }

    @State("Create vault entries for valid CreditCardExpiryYear")
    public void createVaultEntriesForValidCreditCardExpiryYear() throws Exception {
        when(vaultClientResponseHelper.createVaultIdDataForEncryptedCard(any(VaultClientRequest.class), any()))
                .thenReturn(getVaultClientResponseForCreditCardExpiryYear());
    }

    @State("Create vault entries for valid Password")
    public void createVaultEntriesForValidPassword() throws Exception {
        when(vaultClientResponseHelper.createVaultIdDataForPassword(any(VaultClientRequest.class), any()))
                .thenReturn(getVaultClientResponseForPassword());
    }

    @State("Create vault entries for given list of types")
    public void createVaultEntriesForListOfTypes() throws Exception {
        when(vaultClientResponseHelper.createVaultIdDataForCreditCard(any(VaultClientRequest.class), any()))
                .thenReturn(getVaultClientResponseForFirstElement());
        when(vaultClientResponseHelper.createVaultIdDataForEncryptedCard(any(VaultClientRequest.class), any()))
                .thenReturn(getVaultClientResponseForSecondElement());
    }

    @State("Create vault entries for invalid GiftCardNumber")
    public void createVaultEntriesForInvalidGiftCardNumber() {
    }

    @State("Create vault entries for invalid GiftCardPin")
    public void createVaultEntriesForInvalidGiftCardPin() {
    }

    @Disabled
    @State("Create vault entries for invalid GiftCardTrack2")
    public void createVaultEntriesForInvalidGiftCardTrack2() {
    }

    @State("Create vault entries for invalid CreditCardNumber")
    public void createVaultEntriesForInvalidCreditCardNumber() {
    }

    @State("Create vault entries for invalid alpha numeric CreditCardExpiryMonth")
    public void createVaultEntriesForInvalidAlphaNumericCreditCardExpiryMonth() {
    }

    @State("Create vault entries for invalid CreditCardExpiryYear")
    public void createVaultEntriesForInvalidCreditCardExpiryYear() {
    }

    @State("Create vault entries without type")
    public void createVaultEntriesWithoutType() {
    }

    @State("Create vault entries without plain text")
    public void createVaultEntriesWithoutPlaintext() {
    }

    @State("Create vault entries without index")
    public void createVaultEntriesWithoutIndex() {
    }

    @State("Create vault entries with invalid type")
    public void createVaultEntriesWithInvalidType() {
    }

    @State("Create vault entries with duplicate indexes")
    public void createVaultEntriesWithDuplicateIndexes() {
    }

    @State("Create vault entries for given GiftCardNumber with invalid minimum card length")
    public void createVaultEntriesForGiftCardNumberWithInvalidMinimumCardLength() {
    }

    @State("Create vault entries for given GiftCardNumber with invalid maximum card length")
    public void createVaultEntriesForGiftCardNumberWithInvalidMaximumCardLength() {
    }

    @State("Create vault entries for given GiftCardPin with invalid minimum pin length")
    public void createVaultEntriesForGiftCardPinWithInvalidMinimumPinLength() {
    }

    @State("Create vault entries for given GiftCardPin with invalid maximum pin length")
    public void createVaultEntriesForGiftCardPinWithInvalidMaximumPinLength() {
    }

    @State("Create vault entries for given GiftCardTrack2 with invalid minimum track2 length")
    public void createVaultEntriesForGiftCardTrack2WithInvalidMinimumTrack2Length() {
    }

    @State("Create vault entries for given GiftCardTrack2 with invalid maximum track2 length")
    public void createVaultEntriesForGiftCardTrack2WithInvalidMaximumTrack2Length() {
    }

    @State("Create vault entries for given CreditCardNumber with invalid minimum card length")
    public void createVaultEntriesForCreditCardNumberWithInvalidMinimumCardLength() {
    }

    @State("Create vault entries for given CreditCardNumber with invalid maximum card length")
    public void createVaultEntriesForCreditCardNumberWithInvalidMaximumCardLength() {
    }

    @State("Create vault entries for given CreditCardExpiryMonth with invalid minimum month length")
    public void createVaultEntriesForCreditCardExpiryMonthWithInvalidMinimumMonthLength() {
    }

    @State("Create vault entries for given CreditCardExpiryMonth with invalid maximum month length")
    public void createVaultEntriesForCreditCardExpiryMonthWithInvalidMaximumMonthLength() {
    }

    @State("Create vault entries for given CreditCardExpiryYear with invalid minimum year length")
    public void createVaultEntriesForCreditCardExpiryYearWithInvalidMinimumYearLength() {
    }

    @State("Create vault entries for given CreditCardExpiryYear with invalid maximum year length")
    public void createVaultEntriesForCreditCardExpiryYearWithInvalidMaximumYearLength() {
    }

    @State("Create vault entries with empty return type")
    public void createVaultEntriesWithEmptyReturnType() {
    }

    @State("Create vault entries with empty plaintext")
    public void createVaultEntriesWithEmptyPlainText() {
    }

    @State("Create vault entries with empty field values")
    public void createVaultEntriesWithEmptyFieldValues() {
    }

    @State("Create vault entries with empty list")
    public void createVaultEntriesWithEmptyList() {
    }

    @State("Create vault entries for invalid CreditCardExpiryMonth")
    public void createVaultEntriesWithInvalidCreditCardExpiryMonth() {
    }

    private VaultClientResponse getVaultClientResponseForCreditCardNumber() {
        return getVaultClientResponseFor(
                "5111111111111111",
                "56DB1013369E224B6C03017CA3ACD546",
                VaultConstants.DATA_TYPE_CREDIT_CARD_NUMBER,
                VaultConstants.DATA_TYPE_VAULT_ID
        );
    }

    private VaultClientResponse getVaultClientResponseForCreditCardExpiryYear() {
        return getVaultClientResponseFor(
                "2022",
                "AD819EC310D6532DE077C378DCE1296B",
                VaultConstants.DATA_TYPE_CREDIT_CARD_EXPIRY_YEAR,
                VaultConstants.DATA_TYPE_VAULT_ID
        );
    }

    private VaultClientResponse getVaultClientResponseForCreditCardExpiryMonth() {
        return getVaultClientResponseFor(
                "12",
                "BCF39A986D5A334C1EE60836CD81F0CB",
                VaultConstants.DATA_TYPE_CREDIT_CARD_EXPIRY_MONTH,
                VaultConstants.DATA_TYPE_VAULT_ID
        );
    }


    private VaultClientResponse getVaultClientResponseForGiftCardNumber() {
        return getVaultClientResponseFor(
                "5111111111111112",
                "6F9EC9918404746CFCF429CC2743BF42",
                VaultConstants.DATA_TYPE_GIFT_CARD_NUMBER,
                VaultConstants.DATA_TYPE_VAULT_ID
        );
    }


    private VaultClientResponse getVaultClientResponseForGiftCardPin() {
        return getVaultClientResponseFor(
                "8563242334532424",
                "A1F024535FE731E1F8F7BCCE94F15948",
                VaultConstants.DATA_TYPE_GIFT_CARD_PIN,
                VaultConstants.DATA_TYPE_VAULT_ID
        );
    }

    private VaultClientResponse getVaultClientResponseForGiftCardTrack2() {
        return getVaultClientResponseFor(
                "8563242334532425",
                "1B3DAD95AFF9509CC6DE025D3336DA5C",
                VaultConstants.DATA_TYPE_GIFT_CARD_TRACK2,
                VaultConstants.DATA_TYPE_VAULT_ID
        );
    }

    private VaultClientResponse getVaultClientResponseForPassword() {
        return getVaultClientResponseFor(
                "testPassword",
                "77E1CA442F51AE3E48B97C66CD574804",
                VaultConstants.DATA_TYPE_PASSWORD,
                VaultConstants.DATA_TYPE_VAULT_ID
        );
    }


    private VaultClientResponse getVaultClientResponseForFirstElement() {
        return getVaultClientResponseFor(
                "4111111111111111",
                "475AABCFCE48CF4D24978E44E8A4E90E",
                VaultConstants.DATA_TYPE_CREDIT_CARD_NUMBER,
                VaultConstants.DATA_TYPE_VAULT_ID
        );
    }

    private VaultClientResponse getVaultClientResponseForSecondElement() {
        return getVaultClientResponseFor(
                "5111111111111112",
                "B8F081BBBF61E57E5DEF1BA37D5C9D75",
                VaultConstants.DATA_TYPE_GIFT_CARD_NUMBER,
                VaultConstants.DATA_TYPE_VAULT_ID
        );
    }


    private VaultClientResponse getVaultClientResponseFor(String requestData, String responseData, String requestFormat, String responseFormat) {
        ArrayList<VaultClientResult> vaultClientResults = new ArrayList<>();
        VaultClientResult vaultClientResult = VaultClientResult.builder()
                .requestData(requestData)
                .responseData(responseData)
                .build();
        vaultClientResults.add(vaultClientResult);

        return VaultClientResponse.builder()
                .result(vaultClientResults)
                .requestFormat(requestFormat)
                .responseFormat(responseFormat)
                .build();
    }
}

