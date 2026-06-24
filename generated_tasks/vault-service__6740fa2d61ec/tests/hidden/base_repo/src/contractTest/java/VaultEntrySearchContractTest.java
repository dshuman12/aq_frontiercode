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
import com.gap.customer.vaultservice.security.CipherClientImpl;
import com.gap.customer.vaultservice.security.CipherHashAlgorithm;
import com.gap.customer.vaultservice.security.CipherKeys;
import com.gap.customer.vaultservice.services.Impl.VaultClientResponseHelper;
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

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.any;
import static org.mockito.Mockito.when;

@ExtendWith(SpringExtension.class)
@Provider("vault-service-vault-entries-search-api")
@PactFolder("contracts")
@SpringBootTest(
        classes = {VaultServiceApplication.class},
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestPropertySource(value = "classpath:application-contract-tests.properties")
public class VaultEntrySearchContractTest {

    private static final String VAULT_ID = "VaultId";

    @MockBean
    private VaultClientResponseHelper vaultClientResponseHelper;

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
    private CipherClientImpl cipherClient;

    @MockBean
    private CipherHashAlgorithm cipherHashAlgorithm;

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
        context.setTarget(new HttpTestTarget("localhost", port));

        when(vaultDataScopeConfig.getCreditcard())
                .thenReturn(Arrays.asList("CREDIT_CARD_EXPIRY_YEAR", "CREDIT_CARD_EXPIRY_MONTH"));
        when(vaultDataScopeConfig.getGiftcard())
                .thenReturn(Arrays.asList("GIFT_CARD_NUMBER", "GIFT_CARD_PIN", "GIFT_CARD_TRACK2"));
        when(vaultDataScopeConfig.getToken()).thenReturn("TOKEN");
        when(vaultFeatureToggle.isLegacyCloud()).thenReturn(false);
    }


    @State("Get Gift Card Pin for given vault id")
    public void getGiftCardPinForGivenVaultId() throws Exception {

        when(vaultClientResponseHelper.searchByVaultIdForEncryptedCard(any(VaultClientRequest.class)))
                .thenReturn(getVaultClientResponse("1C92A3FF5BFBFB5AC8B3849458D8D329", "3345"));
    }

    @State("Get Gift Card Number for given vault id")
    public void getGiftCardNumberForGivenVaultId() throws Exception {
        when(vaultClientResponseHelper.searchByVaultIdForEncryptedCard(any(VaultClientRequest.class)))
                .thenReturn(getVaultClientResponse("1C92A3FF5BFBFB5AC8B3849458D8D329", "4479951709255127"));
    }

    @State("Get Gift Card Track2 for given vault id")
    public void getGiftCardTrack2ForGivenVaultId() throws Exception {
        when(vaultClientResponseHelper.searchByVaultIdForEncryptedCard(any(VaultClientRequest.class)))
                .thenReturn(getVaultClientResponse("1C92A3FF5BFBFB5AC8B3849458D8D329", "4479951709255127"));
    }

    @State("Get Credit card expiry month for given vault id")
    public void getCreditCardExpiryMonthForGivenVaultId() throws Exception {
        when(vaultClientResponseHelper.searchByVaultIdForEncryptedCard(any(VaultClientRequest.class)))
                .thenReturn(getVaultClientResponse("1C92A3FF5BFBFB5AC8B3849458D8D329", "11"));
    }

    @State("Get Credit card expiry year for given vault id")
    public void getCreditCardExpiryYearForGivenVaultId() throws Exception {
        when(vaultClientResponseHelper.searchByVaultIdForEncryptedCard(any(VaultClientRequest.class)))
                .thenReturn(getVaultClientResponse("1C92A3FF5BFBFB5AC8B3849458D8D329", "2026"));
    }

    @State("Get token for given vault id")
    public void getTokenForGivenVaultId() throws Exception {
        when(vaultClientResponseHelper.searchByVaultIdForToken(any(VaultClientRequest.class), any()))
                .thenReturn(getVaultClientResponseWithBluefin("7541241B84272D52464FCA14F196F047", "4111118216452222", "4111112231602222"));
    }

    @State("Request without Index.")
    public void vaultEntriesSearchRequestWithoutIndex() {
    }

    @State("Request without ReturnType.")
    public void vaultEntriesSearchRequestWithoutReturnType() {
    }

    @State("Request without VaultId.")
    public void vaultEntriesSearchRequestWithoutVaultId() {
    }

    @State("Request without Unique Index.")
    public void vaultEntriesSearchRequestWithoutUniqueIndex() {
    }

    @State("Request with Invalid VaultId Length.")
    public void vaultEntriesSearchRequestWithVaultIdHavingInvalidLength() {
    }

    @State("Request with Non Alphanumeric VaultId.")
    public void vaultEntriesSearchRequestWithVaultIdHavingNonAlphanumeric() {
    }

    @State("Request with Invalid Return Type")
    public void vaultEntriesSearchRequestWithInvalidReturnType() {
    }

    @State("Request with empty list.")
    public void vaultEntriesSearchRequestWithEmptyList() {
    }

    @State("Request with empty ReturnType.")
    public void vaultEntriesSearchRequestWithEmptyReturnType() {
    }

    @State("Request with empty VaultId.")
    public void vaultEntriesSearchRequestWithEmptyVaultId() {
    }

    @State("Request with empty fields")
    public void vaultEntriesSearchRequestWithEmptyFieldValues() {
    }

    @State("Request without apigee scopes")
    public void vaultEntriesSearchRequestWithOutApigeeScopes() {
    }

    @State("Get valid responses for given list of requests with multiple return types.")
    public void getValidResponsesForListOfRequestsWithDifferentDataTypes() throws Exception {
        String[] giftCardPinVaultId = {"90E0E57687E93CAB09E999AAC3305B5E"};
        String[] giftCardNumberVaultId = {"1C92A3FF5BFBFB5AC8B3849458D8D329"};
        String[] creditCardExpiryYearVaultId = {"CAA78DF96CADDBAD1EAB3A2929B6797D"};
        VaultClientRequest giftCardPinRequest = buildVaultClientRequest(giftCardPinVaultId, "GiftCardPin");
        VaultClientRequest giftCardNumberRequest = buildVaultClientRequest(giftCardNumberVaultId, "GiftCardNumber");
        VaultClientRequest creditCardExpiryYearRequest = buildVaultClientRequest(creditCardExpiryYearVaultId, "CreditCardExpiryYear");

        when(vaultClientResponseHelper.searchByVaultIdForEncryptedCard(eq(giftCardPinRequest)))
                .thenReturn(getVaultClientResponse("90E0E57687E93CAB09E999AAC3305B5E", "4433"));
        when(vaultClientResponseHelper.searchByVaultIdForEncryptedCard(eq(giftCardNumberRequest)))
                .thenReturn(getVaultClientResponse("1C92A3FF5BFBFB5AC8B3849458D8D329", "4479951709255127"));
        when(vaultClientResponseHelper.searchByVaultIdForEncryptedCard(eq(creditCardExpiryYearRequest)))
                .thenReturn(getVaultClientResponse("CAA78DF96CADDBAD1EAB3A2929B6797D", "2025"));
        when(vaultClientResponseHelper.searchByVaultIdForToken(any(VaultClientRequest.class), any()))
                .thenReturn(getVaultClientResponseWithBluefin("58DA60942CAABA8EB1DCFC48EC1D81FC", "523434564455656787", "523434430309176787"));
    }

    @State("Get valid or not found as response for given list of requests with multiple return types.")
    public void getResponseWithNotFoundForGivenValidIdNotFound() throws Exception {
        String[] giftCardPinVaultId = {"90E0E57687E93CAB09E999AAC3305B5E"};
        String[] giftCardNumberVaultId = {"1C92A3FF5BFBFB5AC8B3849458D8D329"};
        String[] creditCardExpiryYearVaultId = {"CAA78DF96CADDBAD1EAB3A2929B6797D"};
        VaultClientRequest giftCardPinRequest = buildVaultClientRequest(giftCardPinVaultId, "GiftCardPin");
        VaultClientRequest giftCardNumberRequest = buildVaultClientRequest(giftCardNumberVaultId, "GiftCardNumber");
        VaultClientRequest creditCardExpiryYearRequest = buildVaultClientRequest(creditCardExpiryYearVaultId, "CreditCardExpiryYear");

        when(vaultClientResponseHelper.searchByVaultIdForEncryptedCard(eq(giftCardPinRequest)))
                .thenReturn(getVaultClientResponseWithEmptyResult());
        when(vaultClientResponseHelper.searchByVaultIdForEncryptedCard(eq(giftCardNumberRequest)))
                .thenReturn(getVaultClientResponse("1C92A3FF5BFBFB5AC8B3849458D8D329", "4479951709255127"));
        when(vaultClientResponseHelper.searchByVaultIdForEncryptedCard(eq(creditCardExpiryYearRequest)))
                .thenReturn(getVaultClientResponseWithEmptyResult());
        when(vaultClientResponseHelper.searchByVaultIdForToken(any(VaultClientRequest.class), any()))
                .thenReturn(getVaultClientResponse("58DA60942CAABA8EB1DCFC48EC1D81FC", "523434564455656787"));
    }

    private VaultClientRequest buildVaultClientRequest(String[] giftCardPinVaultId, String giftCardPin) {
        return VaultClientRequest.builder()
                .requestData(giftCardPinVaultId)
                .requestFormat(VAULT_ID)
                .responseFormat(giftCardPin)
                .build();
    }

    private VaultClientResponse getVaultClientResponseWithEmptyResult() {
        VaultClientResponse vaultClientResponse = new VaultClientResponse();
        ArrayList<VaultClientResult> vaultClientResultList = new ArrayList<>();
        vaultClientResponse.setResult(vaultClientResultList);
        return vaultClientResponse;
    }

    private VaultClientResponse getVaultClientResponse(String requestData, String responseData) {
        VaultClientResult vaultClientResult = VaultClientResult.builder()
                .requestData(requestData)
                .responseData(responseData)
                .build();
        ArrayList<VaultClientResult> vaultClientResultList = new ArrayList<>();
        vaultClientResultList.add(vaultClientResult);

        return VaultClientResponse.builder()
                .result(vaultClientResultList)
                .build();
    }

    private VaultClientResponse getVaultClientResponseWithBluefin(String requestData, String responseData, String bfToken) {
        VaultClientResult vaultClientResult = VaultClientResult.builder()
                .requestData(requestData)
                .responseData(responseData)
                .bluefinId("test-bluefin-id")
                .bluefinToken(bfToken).build();
        ArrayList<VaultClientResult> vaultClientResults = new ArrayList<>();
        vaultClientResults.add(vaultClientResult);

        return VaultClientResponse.builder()
                .requestFormat("VaultId")
                .responseFormat("Token")
                .result(vaultClientResults)
                .build();
    }
}