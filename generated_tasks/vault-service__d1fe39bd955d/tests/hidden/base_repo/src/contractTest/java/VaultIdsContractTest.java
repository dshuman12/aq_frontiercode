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

import com.gap.customer.vaultservice.repository.azureSql.DataTypeRepository;
import com.gap.customer.vaultservice.repository.azureSql.TokenRepository;
import com.gap.customer.vaultservice.repository.azureSql.EncryptedDataRepository;
import com.gap.customer.vaultservice.repository.azureSql.DataTypeKeyDataRepository;
import com.gap.customer.vaultservice.repository.azureSql.PasswordRepository;
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

import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.Mockito.any;
import static org.mockito.Mockito.when;

@ExtendWith(SpringExtension.class)
@Provider("vault-service-vault-ids-api")
@PactFolder("contracts")
@SpringBootTest(
        classes = {VaultServiceApplication.class},
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestPropertySource(value = "classpath:application-contract-tests.properties")
@Disabled
public class VaultIdsContractTest {

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
    private EncryptedDataRepository encryptedDataRepository;

    @LocalServerPort
    private int port;

    @TestTemplate
    @ExtendWith(PactVerificationInvocationContextProvider.class)
    void pactVerificationTestTemplate(PactVerificationContext context) {
        context.verifyInteraction();
    }

    @BeforeEach
    void before(PactVerificationContext context) {
        context.setTarget(new HttpTestTarget("localhost", port));
    }

    @State("Create vault id for valid credit card number")
    public void createVaultIdForGivenCreditCardNumber() throws Exception {
        when(vaultClientResponseHelper.createVaultIdDataForCreditCard(any(VaultClientRequest.class), any()))
                .thenReturn(getVaultClientResponseForCreditCardNumber());
    }

    @State("Create vault ids for valid credit card numbers")
    public void createVaultIdsForGivenCreditCardNumbers() throws Exception {
        when(vaultClientResponseHelper.createVaultIdDataForCreditCard(any(VaultClientRequest.class), any()))
                .thenReturn(getVaultClientResponseForListOfCreditCardNumbers());
    }

    @State("Request without Unique Index")
    public void vaultIdsRequestWithoutUniqueIndex() {
    }

    @State("Request with Invalid Return Type")
    public void vaultIdsRequestWithInvalidReturnType() {
    }

    @State("Request without Index")
    public void vaultIdsRequestWithoutIndex() {
    }

    @State("Request without ReturnType")
    public void vaultIdsRequestWithoutReturnType() {
    }

    @State("Request without plain text")
    public void vaultIdsRequestWithoutPlainText() {
    }

    @State("Request with invalid minimum credit card length")
    public void vaultIdsRequestWithInvalidMinimumCardLength() {
    }

    @State("Request with invalid maximum credit card length")
    public void vaultIdsRequestWithInvalidMaximumCardLength() {
    }

    @State("Request with invalid credit card number")
    public void vaultIdsRequestWithInvalidCardNumber() {
    }

    private VaultClientResponse getVaultClientResponseForCreditCardNumber() {
        ArrayList<VaultClientResult> vaultClientResults = new ArrayList<>();
        VaultClientResult vaultClientResult = VaultClientResult.builder()
                .requestData("5111111111111111")
                .responseData("56DB1013369E224B6C03017CA3ACD546")
                .build();
        vaultClientResults.add(vaultClientResult);
        return VaultClientResponse.builder()
                .result(vaultClientResults)
                .requestFormat(VaultConstants.DATA_TYPE_CREDIT_CARD_NUMBER)
                .responseFormat(VaultConstants.DATA_TYPE_VAULT_ID)
                .build();
    }

    private VaultClientResponse getVaultClientResponseForListOfCreditCardNumbers() {
        ArrayList<VaultClientResult> vaultClientResults = new ArrayList<>();
        VaultClientResult vaultClientResult1 = VaultClientResult.builder()
                .requestData("4111111111111111")
                .responseData("475AABCFCE48CF4D24978E44E8A4E90E")
                .build();
        VaultClientResult vaultClientResult2 = VaultClientResult.builder()
                .requestData("4111111111111112")
                .responseData("0E98E4D89A3C07DF322D300BEAAE7CB0")
                .build();
        vaultClientResults.add(vaultClientResult1);
        vaultClientResults.add(vaultClientResult2);
        return VaultClientResponse.builder()
                .result(vaultClientResults)
                .requestFormat(VaultConstants.DATA_TYPE_CREDIT_CARD_NUMBER)
                .responseFormat(VaultConstants.DATA_TYPE_VAULT_ID)
                .build();
    }
}
