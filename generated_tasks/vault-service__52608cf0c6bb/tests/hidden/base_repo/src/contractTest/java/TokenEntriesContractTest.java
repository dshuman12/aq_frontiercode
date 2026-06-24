import au.com.dius.pact.provider.junit.Provider;
import au.com.dius.pact.provider.junit.State;
import au.com.dius.pact.provider.junit.loader.PactFolder;
import au.com.dius.pact.provider.junit5.HttpTestTarget;
import au.com.dius.pact.provider.junit5.PactVerificationContext;
import au.com.dius.pact.provider.junit5.PactVerificationInvocationContextProvider;
import com.gap.customer.vaultservice.VaultServiceApplication;
import com.gap.customer.vaultservice.models.TokenResponse;
import com.gap.customer.vaultservice.models.VaultFeatureToggle;
import com.gap.customer.vaultservice.repository.azureSql.DataTypeKeyDataRepository;
import com.gap.customer.vaultservice.repository.azureSql.DataTypeRepository;
import com.gap.customer.vaultservice.repository.azureSql.EncryptedDataRepository;
import com.gap.customer.vaultservice.repository.azureSql.LookUpRepository;
import com.gap.customer.vaultservice.repository.azureSql.PasswordRepository;
import com.gap.customer.vaultservice.repository.azureSql.TokenRepository;
import com.gap.customer.vaultservice.security.CipherKeys;
import com.gap.customer.vaultservice.services.Impl.ClientMediator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.TestTemplate;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.boot.web.server.LocalServerPort;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.junit.jupiter.SpringExtension;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.any;
import static org.mockito.Mockito.when;

@ExtendWith(SpringExtension.class)
@Provider("vault-service-token-entries-api")
@PactFolder("contracts")
@SpringBootTest(
        classes = {VaultServiceApplication.class},
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestPropertySource(value = "classpath:application-contract-tests.properties")
public class TokenEntriesContractTest {

    @MockBean
    TokenRepository tokenRepository;

    @MockBean
    DataTypeKeyDataRepository dataTypeKeyDataRepository;

    @MockBean
    DataTypeRepository dataTypeRepository;

    @MockBean
    PasswordRepository passwordRepository;

    @MockBean
    private ClientMediator clientMediator;

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

    @State("Create token entry for valid credit card number")
    public void createTokenEntryForValidCreditCardNumber() throws Exception {
        when(clientMediator.mapperForTokenEntries(anyList(), any()))
                .thenReturn(getResponseForCreditCardNumber());
    }

    @State("Create token entries for valid credit card numbers")
    public void createTokenEntriesForValidCreditCardNumbers() throws Exception {
        when(vaultFeatureToggle.isLegacyCloud()).thenReturn(false);
        when(clientMediator.mapperForTokenEntries(anyList(), any()))
                .thenReturn((getVaultClientResponseForListOfCreditCardNumbers()));
    }

    @State("Request without Index")
    public void tokenEntriesRequestWithoutIndex() {
    }

    @State("Request without Type")
    public void tokenEntriesRequestWithoutType() {
    }

    @State("Request with empty type and plaintext")
    public void tokenEntriesRequestWithEmptyTypeAndPlainText() {
    }

    @State("Request without Index Type and Plaintext")
    public void tokenEntriesRequestWithoutIndexAndTypeAndPlainText() {
    }

    @State("Request without PlainText")
    public void tokenEntriesRequestWithoutPlainText() {
    }

    @State("Request without Unique Index")
    public void tokenEntriesRequestWithoutUniqueIndex() {
    }

    @State("Request with invalid minimum allowed credit card number Length")
    public void tokenEntriesRequestWithInvalidMinimumAllowedLength() {
    }

    @State("Request with invalid maximum allowed credit card number Length")
    public void tokenEntriesRequestWithInvalidMaximumAllowedLength() {
    }

    @State("Request with alphanumeric credit card number")
    public void tokenEntriesRequestWithAlphanumericCreditCardNumber() {
    }

    @State("Request with Invalid Type")
    public void tokenEntriesRequestWithInvalidType() {
    }

    private List<TokenResponse> getResponseForCreditCardNumber() {
        TokenResponse tokenResponse = TokenResponse.builder()
                .bfToken("4479952618035127")
                .token("4479950329695127")
                .tokenId("test-bluefin-id")
                .index(0)
                .build();

        return Arrays.asList(tokenResponse);
    }

    private List<TokenResponse> getVaultClientResponseForListOfCreditCardNumbers() {
        List<TokenResponse> tokenResponses = new ArrayList<>();

        TokenResponse tokenResponse1 = TokenResponse.builder()
                .token("4479950329695127")
                .bfToken("4479952618035127")
                .tokenId("test-bluefin-id1")
                .index(0)
                .build();

        TokenResponse tokenResponse2 = TokenResponse.builder()
                .token("4479950625605128")
                .bfToken("4479952618035128")
                .tokenId("test-bluefin-id2")
                .index(1)
                .build();

        TokenResponse tokenResponse3 = TokenResponse.builder()
                .token("4479954008935129")
                .bfToken("4479952618035129")
                .tokenId("test-bluefin-id3")
                .index(2)
                .build();

        tokenResponses.add(tokenResponse1);
        tokenResponses.add(tokenResponse2);
        tokenResponses.add(tokenResponse3);

        return tokenResponses;
    }
}
