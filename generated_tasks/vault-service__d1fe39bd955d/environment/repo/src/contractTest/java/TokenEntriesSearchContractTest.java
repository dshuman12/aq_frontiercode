import au.com.dius.pact.provider.junit.Provider;
import au.com.dius.pact.provider.junit.State;
import au.com.dius.pact.provider.junit.loader.PactFolder;
import au.com.dius.pact.provider.junit5.HttpTestTarget;
import au.com.dius.pact.provider.junit5.PactVerificationContext;
import au.com.dius.pact.provider.junit5.PactVerificationInvocationContextProvider;
import com.gap.customer.vaultservice.VaultServiceApplication;
import com.gap.customer.vaultservice.models.SearchResponse;
import com.gap.customer.vaultservice.models.VaultDataScopeConfig;
import com.gap.customer.vaultservice.models.VaultFeatureToggle;
import com.gap.customer.vaultservice.repository.azureSql.DataTypeKeyDataRepository;
import com.gap.customer.vaultservice.repository.azureSql.DataTypeRepository;
import com.gap.customer.vaultservice.repository.azureSql.EncryptedDataRepository;
import com.gap.customer.vaultservice.repository.azureSql.LookUpRepository;
import com.gap.customer.vaultservice.repository.azureSql.PasswordRepository;
import com.gap.customer.vaultservice.repository.azureSql.TokenRepository;
import com.gap.customer.vaultservice.security.CipherKeys;
import com.gap.customer.vaultservice.services.Impl.ClientMediator;
import com.gap.customer.vaultservice.services.Impl.VaultClientResponseHelperImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.TestTemplate;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.boot.web.server.LocalServerPort;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.junit.jupiter.SpringExtension;

import java.util.ArrayList;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.when;

@ExtendWith(SpringExtension.class)
@Provider("vault-service-token-entries-search-api")
@PactFolder("contracts")
@SpringBootTest(classes = {VaultServiceApplication.class},
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestPropertySource(value = "classpath:application-contract-tests.properties")

public class TokenEntriesSearchContractTest {

    @MockBean
    VaultClientResponseHelperImpl vaultClientResponseHelper;

    @MockBean
    private VaultDataScopeConfig vaultDataScopeConfig;

    @MockBean
    private TokenRepository tokenRepository;

    @MockBean
    private DataTypeRepository dataTypeRepository;

    @MockBean
    private DataTypeKeyDataRepository dataTypeKeyDataRepository;

    @MockBean
    private PasswordRepository passwordRepository;

    @MockBean
    private EncryptedDataRepository encryptedDataRepository;

    @MockBean
    private LookUpRepository lookUpRepository;

    @MockBean
    private ClientMediator clientMediator;

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
    void before(PactVerificationContext context) throws Exception {
        when(vaultFeatureToggle.isLegacyCloud()).thenReturn(false);
        context.setTarget(new HttpTestTarget("localhost", port));
    }

    @State("Get vault id and bluefin token info when valid voltage token is given")
    public void getVaultIdAndBluefinTokenInfoFromVoltageToken() throws Exception {
        when(clientMediator.mapperForTokenEntriesSearch(anyList(), any()))
                .thenReturn(getTokenEntriesSearchResponseWithBluefinTokenInfo());
    }

    @State("Get vault id and voltage token when valid bluefin token info is given")
    public void getVaultIdAndVoltageTokenFromBluefinTokenInfo() throws Exception {
        when(clientMediator.mapperForTokenEntriesSearch(anyList(), any()))
                .thenReturn(getTokenEntriesSearchResponseWithVoltageToken());
    }

    @State("Get Vault Id when given input type is valid List of Tokens")
    public void getVaultIdFromTokenList() throws Exception {
        when(clientMediator.mapperForTokenEntriesSearch(anyList(), any()))
                .thenReturn(getTokenEntriesSearchResponses());
    }

    @State("Request without Index")
    public void tokenEntriesSearchRequestWithoutIndex() {
    }

    @State("Request without Unique Index")
    public void tokenEntriesSearchRequestWithoutUniqueIndex() {
    }

    @State("Request with Invalid Token Length for minimum")
    public void tokenEntriesSearchRequestWithoutValidLengthForMinimum() {
    }

    @State("Request Invalid Token Length for maximum")
    public void tokenEntriesSearchRequestWithoutValidLengthForMaximum() {
    }

    @State("Request with Alphanumeric Value")
    public void tokenEntriesSearchRequestWithAlphanumeric() {
    }

    @State("Request with Invalid Return Type")
    public void tokenEntriesSearchRequestWithInvalidReturnType() {
    }

    @State("Request without Token")
    public void tokenEntriesSearchRequestWithoutToken() {
    }

    @State("Request without ReturnType")
    public void tokenEntriesSearchRequestWithoutReturnType() {
    }

    @State("Request with Invalid Return Type and Token")
    public void tokenEntriesSearchRequestWithoutReturnTypeAndToken() {
    }

    @State("Request with Empty Return Type")
    public void tokenEntriesSearchRequestWithEmptyReturnType() {
    }

    @State("Request with empty json")
    public void tokenEntriesSearchRequestWithEmptyRequest() {
    }


    private List<SearchResponse> getTokenEntriesSearchResponseWithVoltageToken() {
        return List.of(getSearchResponseFor(
                        0,
                        "773B9BB7D252CC5C29E159461A035BBF",
                        "123434564455656787",
                        null
                )
        );
    }

    private List<SearchResponse> getTokenEntriesSearchResponseWithBluefinTokenInfo() {
        return List.of(getSearchResponseFor(
                0,
                "773B9BB7D252CC5C29E159461A035BBF",
                "411111921191111",
                "djI6MTIwMjIwMjI0MTAwOTA0MTAyMzAyNDY4NyMwfGJjNWQwNTdiNTAzOTIwMDc3YmRmMGJmYTc4NWFhZTZmfHx8"
        ));
    }

    private List<SearchResponse> getTokenEntriesSearchResponses() {
        List<SearchResponse> searchResponses = new ArrayList<>();
        searchResponses.add(getSearchResponseFor(
                        0,
                        "773B9BB7D252CC5C29E159461A035BBF",
                        "411111921191111",
                        "djI6MTIwMjIwMjI0MTAwOTA0MTAyMzAyNDY4NyMwfGJjNWQwNTdiNTAzOTIwMDc3YmRmMGJmYTc4NWFhZTZmfHx8"
                )
        );
        searchResponses.add(getSearchResponseFor(1,
                        "773B9BB7D252CC5C29E159461A035BBF",
                        "123434564455656787",
                        null
                )
        );
        return searchResponses;
    }

    private SearchResponse getSearchResponseFor(int index, String responseData, String token, String tokenId) {
        return SearchResponse.builder()
                .index(index)
                .responseData(responseData)
                .token(token)
                .tokenId(tokenId)
                .build();
    }
}

