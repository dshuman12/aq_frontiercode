import au.com.dius.pact.provider.junit.Provider;
import au.com.dius.pact.provider.junit.State;
import au.com.dius.pact.provider.junit.loader.PactFolder;
import au.com.dius.pact.provider.junit5.HttpTestTarget;
import au.com.dius.pact.provider.junit5.PactVerificationContext;
import au.com.dius.pact.provider.junit5.PactVerificationInvocationContextProvider;
import com.gap.customer.vaultservice.VaultServiceApplication;
import com.gap.customer.vaultservice.exception.DataNotFoundException;
import com.gap.customer.vaultservice.models.MatchResponse;
import com.gap.customer.vaultservice.models.VaultFeatureToggle;
import com.gap.customer.vaultservice.repository.azureSql.DataTypeKeyDataRepository;
import com.gap.customer.vaultservice.repository.azureSql.DataTypeRepository;
import com.gap.customer.vaultservice.repository.azureSql.EncryptedDataRepository;
import com.gap.customer.vaultservice.repository.azureSql.LookUpRepository;
import com.gap.customer.vaultservice.repository.azureSql.PasswordRepository;
import com.gap.customer.vaultservice.repository.azureSql.TokenRepository;
import com.gap.customer.vaultservice.security.CipherKeys;
import com.gap.customer.vaultservice.services.Impl.PasswordClientAdapter;
import com.gap.customer.vaultservice.services.Impl.TokenClientAdapter;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.TestTemplate;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.boot.web.server.LocalServerPort;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.junit.jupiter.SpringExtension;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(SpringExtension.class)
@Provider("vault-service-match-api")
@PactFolder("contracts")
@SpringBootTest(classes = {VaultServiceApplication.class},
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestPropertySource(value = "classpath:application-contract-tests.properties")

public class MatchContractTest {

    @MockBean
    private TokenRepository tokenRepository;

    @MockBean
    private DataTypeRepository dataTypeRepository;
    
    @MockBean
    private LookUpRepository lookUpRepository;

    @MockBean
    private DataTypeKeyDataRepository dataTypeKeyDataRepository;

    @MockBean
    private VaultFeatureToggle vaultFeatureToggle;

    @MockBean
    private EncryptedDataRepository encryptedDataRepository;

    @MockBean
    private CipherKeys cipherKeys;

    @MockBean
    private TokenClientAdapter tokenClientAdapter;

    @MockBean
    private PasswordClientAdapter passwordClientAdapter;
    
    @MockBean
    private PasswordRepository passwordRepository;

    @TestTemplate
    @ExtendWith(PactVerificationInvocationContextProvider.class)
    void pactVerificationTestTemplate(PactVerificationContext context) {
        context.verifyInteraction();
    }

    @LocalServerPort
    private int port;

    @BeforeEach
    void before(PactVerificationContext context) {
        when(vaultFeatureToggle.isLegacyCloud()).thenReturn(false);
        context.setTarget(new HttpTestTarget("localhost", port));
    }

    @State("Get match result when given password and vault id are matching.")
    public void getMatchResultFromMatchingPasswordAndVaultId() throws Exception {
        when(passwordClientAdapter.retrieve(anyString(), anyString())).thenReturn("4104106556610045");
    }

    @State("Get match result when given password and vault id are mismatching.")
    public void getMatchResultFromMisMatchingPasswordAndVaultId() throws Exception {
        when(passwordClientAdapter.retrieve(anyString(), anyString())).thenReturn("wrong_password");
    }

    @State("Get match result when vaultId is not present in database.")
    public void getMatchResultWithVaultIdNotWhichIsNotPresentInDatabase() throws Exception {
        when(passwordClientAdapter.retrieve(anyString(), anyString())).thenThrow(new DataNotFoundException());
    }

    @State("Request with empty plaintext.")
    public void matchRequestWithEmptyPlainText() {
    }

    @State("Request with empty json")
    public void matchRequestWithEmptyRequest() {
    }

    @State("Request with empty type.")
    public void matchRequestWithEmptyType() {
    }

    @State("Request with empty vaultId.")
    public void matchRequestWithEmptyVaultId() {
    }

    @State("Request with blank vaultId.")
    public void matchRequestWithBlankVaultId() {
    }

    @State("Request with list of passwords and vaultIds.")
    public void matchRequestWithListOfPasswords() {
    }

    @State("Request with missing plaintext.")
    public void matchRequestWithMissingPlainText() {
    }

    @State("Request with missing type.")
    public void matchRequestWithMissingType() {
    }

    @State("Request with missing vault id.")
    public void matchRequestWithMissingVaultId() {
    }
    @State("Request with invalid type.")
    public void matchRequestWithInvalidType() {
    }

    @State("Request with invalid vault id.")
    public void matchRequestWithInvalidVaultId() {
    }

    @State("Request with invalid vault id length.")
    public void matchRequestWithInvalidVaultIdWithMaximumLength() {
    }



    private MatchResponse getMatchResultForMatchingCase() {
        MatchResponse matchResponse = new MatchResponse();
        matchResponse.setResult(true);

        return matchResponse;

    }

    private MatchResponse getMatchResultForMisMatchingCase() {
        MatchResponse matchResponse = new MatchResponse();
        matchResponse.setResult(false);

        return matchResponse;

    }
}
