package com.gap.customer.vaultservice.validators;

import com.gap.customer.vaultservice.Validators.VaultEntryServiceValidator;
import com.gap.customer.vaultservice.Validators.VaultEntryServiceValidatorUtil;
import com.gap.customer.vaultservice.Validators.VaultServiceCreditCardValidator;
import com.gap.customer.vaultservice.error.ErrorEntityCodes;
import com.gap.customer.vaultservice.exception.ValidationException;
import com.gap.customer.vaultservice.models.TokenSearchRequest;
import com.gap.customer.vaultservice.models.VaultRequest;
import com.gap.customer.vaultservice.util.VaultConstants;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;

import static com.gap.customer.vaultservice.util.VaultTestDataUtil.createTokenSearchRequest;
import static java.util.Arrays.asList;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

public class VaultEntryServiceValidatorTest {

    @Mock
    private VaultEntryServiceValidatorUtil vaultEntryServiceValidatorUtil;

    @Mock
    private VaultServiceCreditCardValidator vaultServiceCreditCardValidator;

    private VaultEntryServiceValidator vaultEntryServiceValidator;


    @BeforeEach
    public void setUp() {
        MockitoAnnotations.openMocks(this);
        vaultEntryServiceValidator = new VaultEntryServiceValidator(vaultEntryServiceValidatorUtil, vaultServiceCreditCardValidator);
    }

    @Test
    void shouldCheckForUniqueIndexes() throws ValidationException {
        HashMap<Integer, Integer> uniqIndexes = new HashMap<>();
        vaultEntryServiceValidator.hasUniqueIndexes(0, uniqIndexes);

        assertDoesNotThrow(() -> vaultEntryServiceValidator.hasUniqueIndexes(1, uniqIndexes));
    }

    @Test
    void shouldThrowInvalidIndexesException() throws ValidationException {
        HashMap<Integer, Integer> uniqIndexes = new HashMap<>();
        vaultEntryServiceValidator.hasUniqueIndexes(0, uniqIndexes);

        ValidationException exception = assertThrows(ValidationException.class, () ->
                vaultEntryServiceValidator.hasUniqueIndexes(0, uniqIndexes));
        assertEquals(ErrorEntityCodes.INDEXES_NOT_UNIQUE, exception.getMessage());
    }


    @Test
    public void shouldReturnTrueForHasValidVaultPostRequestsForTokenEntries() throws ValidationException {

        List<String> creditCardNumbers = new ArrayList<>();
        creditCardNumbers.add("4479951709255127");
        creditCardNumbers.add("4479951709255134");
        List<VaultRequest> vaultRequestForCreditCardNumbers = getVaultRequestForCreditCardNumbers(creditCardNumbers);
        when(vaultEntryServiceValidatorUtil.hasValidatePostRequestsForTokenEntries(any(VaultRequest.class), any(String.class))).thenReturn(true);

        boolean result = vaultEntryServiceValidator.hasValidVaultPostRequestsForTokenEntries(vaultRequestForCreditCardNumbers, "VaultTests");
        assertTrue(result);
    }

    @Test
    public void throwErrorForHasValidVaultPostRequestsForTokenEntriesWhenCreditCardNumberIsEmpty() {
        List<String> creditCardNumbers = new ArrayList<>();
        creditCardNumbers.add("");
        creditCardNumbers.add("4479951709255134");
        List<VaultRequest> vaultRequestForCreditCardNumbers = getVaultRequestForCreditCardNumbers(creditCardNumbers);
        ValidationException exception = assertThrows(ValidationException.class, () ->
                vaultEntryServiceValidator.hasValidVaultPostRequestsForTokenEntries(vaultRequestForCreditCardNumbers, "VaultTests"));

        assertEquals(ErrorEntityCodes.INPUT_DATA_MISSING, exception.getMessage());
        assertEquals(0, exception.getIndex());
    }

    @Test
    public void throwErrorForHasValidVaultPostRequestsForTokenEntriesWhenIndexIsDuplicate() throws ValidationException {
        List<VaultRequest> vaultRequestForCreditCardNumbers = new ArrayList<>();

        VaultRequest vaultRequest = VaultRequest.builder()
                .type("CREDIT_CARD_NUMBER")
                .index(0)
                .plaintext("4489951947252334")
                .build();
        VaultRequest vaultRequest2 = VaultRequest.builder()
                .type("CREDIT_CARD_NUMBER")
                .index(0)
                .plaintext("4489951947252356")
                .build();
        vaultRequestForCreditCardNumbers.add(vaultRequest);
        vaultRequestForCreditCardNumbers.add(vaultRequest2);

        when(vaultEntryServiceValidatorUtil.hasValidatePostRequestsForTokenEntries(any(VaultRequest.class),any(String.class))).thenReturn(true);
        ValidationException exception = assertThrows(ValidationException.class, () ->
                vaultEntryServiceValidator.hasValidVaultPostRequestsForTokenEntries(vaultRequestForCreditCardNumbers, "VaultTests"));
        assertEquals(ErrorEntityCodes.INDEXES_NOT_UNIQUE, exception.getMessage());
        assertEquals(0, exception.getIndex());
    }

    @Test
    public void throwErrorForHasValidVaultPostRequestsForTokenEntriesWhenTypeIsMissing() {
        List<VaultRequest> vaultRequestForCreditCardNumbers = new ArrayList<>();

        VaultRequest vaultRequest = VaultRequest.builder()
                .type("")
                .index(0)
                .plaintext("4489951947252334")
                .build();
        VaultRequest vaultRequest2 = VaultRequest.builder()
                .type("CREDIT_CARD_NUMBER")
                .index(1)
                .plaintext("4489951947252356")
                .build();
        vaultRequestForCreditCardNumbers.add(vaultRequest);
        vaultRequestForCreditCardNumbers.add(vaultRequest2);

        ValidationException exception = assertThrows(ValidationException.class, () ->
                vaultEntryServiceValidator.hasValidVaultPostRequestsForTokenEntries(vaultRequestForCreditCardNumbers, "VaultTests"));
        String expectedMessage = ErrorEntityCodes.INPUT_DATA_MISSING;
        String actualMessage = exception.getMessage();
        assertTrue(actualMessage.contains(expectedMessage));
        assertEquals(0, exception.getIndex());
    }

    @Test
    public void returnTrueForHasValidVaultPostRequests() throws ValidationException {
        List<VaultRequest> vaultRequestForCreditCardNumbers = getVaultRequestForCreditCardNumbers(asList("4479951709255127", "4479951709255134"));
        when(vaultEntryServiceValidatorUtil.hasValidatePostRequests(any(VaultRequest.class), any(String.class))).thenReturn(true);

        boolean result = vaultEntryServiceValidator.hasValidVaultPostRequests(vaultRequestForCreditCardNumbers, "VaultTests");
        assertTrue(result);
    }

    @Test
    public void returnTrueForHasValidVaultPostRequestsForEmptyRequest() throws ValidationException {
        List<VaultRequest> vaultRequestForCreditCardNumbers = new ArrayList<>();

        assertThrows(ValidationException.class, () ->
                vaultEntryServiceValidator.hasValidVaultPostRequests(vaultRequestForCreditCardNumbers, "VaultTests"));
    }

    @Test
    public void returnTrueForHasValidVaultPostRequestsForNullRequest() throws ValidationException {

        assertThrows(ValidationException.class, () ->
                vaultEntryServiceValidator.hasValidVaultPostRequests(null, "VaultTests"));
    }

    @Test
    public void returnTrueForHasValidVaultPostRequestsForTokenEntriesForEmptyRequest() throws ValidationException {
        List<VaultRequest> vaultRequestForCreditCardNumbers = new ArrayList<>();

        assertThrows(ValidationException.class, () ->
                vaultEntryServiceValidator.hasValidVaultPostRequestsForTokenEntries(vaultRequestForCreditCardNumbers, "VaultTests"));
    }

    @Test
    public void returnTrueForHasValidVaultPostRequestsForTokenEntriesForNullRequest() throws ValidationException {

        assertThrows(ValidationException.class, () ->
                vaultEntryServiceValidator.hasValidVaultPostRequestsForTokenEntries(null, "VaultTests"));
    }

    @Test
    public void returnFalseForHasValidVaultPostRequestsWhenPlainTextIsEmpty() throws ValidationException {
        VaultRequest vaultRequest = VaultRequest.builder().index(0).type(VaultConstants.DATA_TYPE_GIFT_CARD_NUMBER).build();
        ValidationException exception = assertThrows(ValidationException.class, () -> {
            vaultEntryServiceValidator.hasValidVaultPostRequests(List.of(vaultRequest), "VaultTests");
        });
        String expectedMessage = ErrorEntityCodes.INPUT_DATA_MISSING;
        String actualMessage = exception.getMessage();
        assertTrue(actualMessage.contains(expectedMessage));
        assertEquals(0, exception.getIndex());
    }

    @Test
    public void returnFalseForHasValidVaultPostRequestsWhenTypeIsEmpty() {
        VaultRequest vaultRequest = VaultRequest.builder().index(0).plaintext("123434353423").build();
        ValidationException exception = assertThrows(ValidationException.class, () -> {
            vaultEntryServiceValidator.hasValidVaultPostRequests(List.of(vaultRequest), "VaultTests");
        });
        String expectedMessage = ErrorEntityCodes.INPUT_DATA_MISSING;
        String actualMessage = exception.getMessage();
        assertTrue(actualMessage.contains(expectedMessage));
        assertEquals(0, exception.getIndex());
    }

    @Test
    public void returnFalseForHasValidVaultPostRequestsWhenIndexIsEmpty() throws ValidationException {
        VaultRequest vaultRequest = VaultRequest.builder().type(VaultConstants.DATA_TYPE_GIFT_CARD_NUMBER).plaintext("123434353423").build();
        ValidationException exception = assertThrows(ValidationException.class, () -> {
            vaultEntryServiceValidator.hasValidVaultPostRequests(List.of(vaultRequest), "VaultTests");
        });
        String expectedMessage = ErrorEntityCodes.INPUT_DATA_MISSING;
        String actualMessage = exception.getMessage();
        assertTrue(actualMessage.contains(expectedMessage));
    }

    @Test
    public void returnFalseForHasValidVaultPostRequestsWhenIndexIsNotUnique() throws ValidationException {
        VaultRequest vaultRequest1 = VaultRequest.builder().index(1).type(VaultConstants.DATA_TYPE_GIFT_CARD_NUMBER)
                .plaintext("123434353423").build();
        VaultRequest vaultRequest2 = VaultRequest.builder().index(1).type(VaultConstants.DATA_TYPE_GIFT_CARD_NUMBER)
                .plaintext("1234343534234").build();
        ValidationException exception = assertThrows(ValidationException.class, () -> {
            vaultEntryServiceValidator.hasValidVaultPostRequests(asList(vaultRequest1, vaultRequest2), "VaultTests");
        });
        String expectedMessage = ErrorEntityCodes.INDEXES_NOT_UNIQUE;
        String actualMessage = exception.getMessage();
        assertEquals(expectedMessage, actualMessage);
        assertEquals(1, exception.getIndex());
    }

    @Test
    public void returnTrueForIsValidsearchVaultIdbyToken() throws ValidationException {
        List<TokenSearchRequest> tokenSearchRequestList = createTokenSearchRequest();
        boolean result = vaultEntryServiceValidator.isValidsearchVaultIdbyToken(tokenSearchRequestList);
        assertTrue(result);
    }

    @Test
    public void throwErrorForIsValidsearchVaultIdbyTokenWhenTokenIsEmpty() throws ValidationException {
        List<String> tokens = new ArrayList<>();
        tokens.add("");
        tokens.add("4479951709255127");
        List<TokenSearchRequest> tokenSearchRequestList = createTokenSearchRequest(tokens);
        ValidationException exception = assertThrows(ValidationException.class, () -> {
            vaultEntryServiceValidator.isValidsearchVaultIdbyToken(tokenSearchRequestList);
        });
        String expectedMessage = ErrorEntityCodes.INPUT_DATA_MISSING_FOR_VAULTID;
        String actualMessage = exception.getMessage();
        assertTrue(actualMessage.contains(expectedMessage));
        assertEquals(0, exception.getIndex());
    }

    @Test
    public void throwErrorForIsValidsearchVaultIdbyTokenWhenIndexIsDuplicate() throws ValidationException {
        List<TokenSearchRequest> tokenRequests = new ArrayList<>();
        TokenSearchRequest tokenRequest1 = getTokenSearchRequest("VAULT_ID", 0, "4489951947255127");
        TokenSearchRequest tokenRequest2 = getTokenSearchRequest("VAULT_ID", 0, "4489951947255128");
        tokenRequests.add(tokenRequest1);
        tokenRequests.add(tokenRequest2);


        ValidationException exception = assertThrows(ValidationException.class, () -> {
            vaultEntryServiceValidator.isValidsearchVaultIdbyToken(tokenRequests);
        });
        String expectedMessage = ErrorEntityCodes.INDEXES_NOT_UNIQUE;
        String actualMessage = exception.getMessage();
        assertTrue(actualMessage.contains(expectedMessage));
        assertEquals(0, exception.getIndex());
    }

    @Test
    public void throwErrorForIsValidsearchVaultIdbyTokenWhenTokenIsInvalid() throws ValidationException {
        List<TokenSearchRequest> tokenRequests = new ArrayList<>();
        TokenSearchRequest tokenRequest1 = getTokenSearchRequest("VAULT_ID", 0, "447995170A255127");
        TokenSearchRequest tokenRequest2 = getTokenSearchRequest("VAULT_ID", 1, "4489951947255128");
        tokenRequests.add(tokenRequest1);
        tokenRequests.add(tokenRequest2);

        ValidationException exception = assertThrows(ValidationException.class, () -> {
            vaultEntryServiceValidator.isValidsearchVaultIdbyToken(tokenRequests);
        });
        String expectedMessage = ErrorEntityCodes.INVALID_TOKEN_DATA;
        String actualMessage = exception.getMessage();
        assertTrue(actualMessage.contains(expectedMessage));
        assertEquals(0, exception.getIndex());
    }

    @Test
    public void throwErrorForIsValidsearchVaultIdbyTokenWhenTokenLengthIsInvalid() throws ValidationException {
        List<TokenSearchRequest> tokenRequests = new ArrayList<>();
        TokenSearchRequest tokenRequest1 = getTokenSearchRequest("VAULT_ID", 0, "4489951947255127");
        TokenSearchRequest tokenRequest2 = getTokenSearchRequest("VAULT_ID", 1, "448995194725512844899519472551284489951947255128");
        tokenRequests.add(tokenRequest1);
        tokenRequests.add(tokenRequest2);

        ValidationException exception = assertThrows(ValidationException.class, () -> {
            vaultEntryServiceValidator.isValidsearchVaultIdbyToken(tokenRequests);
        });
        String expectedMessage = ErrorEntityCodes.INVALID_TOKEN_LENGTH;
        String actualMessage = exception.getMessage();
        assertTrue(actualMessage.contains(expectedMessage));
        assertEquals(1, exception.getIndex());
    }

    @Test
    public void throwErrorForIsValidsearchVaultIdbyTokenWhenTypeIsMissing() throws ValidationException {
        List<TokenSearchRequest> tokenRequests = new ArrayList<>();
        TokenSearchRequest tokenRequest1 = getTokenSearchRequest("VAULT_ID1", 0, "4489951947255127");
        TokenSearchRequest tokenRequest2 = getTokenSearchRequest("VAULT_ID", 1, "448995194725512844899519472551284489951947255128");
        tokenRequests.add(tokenRequest1);
        tokenRequests.add(tokenRequest2);


        ValidationException exception = assertThrows(ValidationException.class, () -> {
            vaultEntryServiceValidator.isValidsearchVaultIdbyToken(tokenRequests);
        });
        String expectedMessage = ErrorEntityCodes.INVALID_RETURN_TYPE;
        String actualMessage = exception.getMessage();
        assertTrue(actualMessage.contains(expectedMessage));
        assertEquals(0, exception.getIndex());
    }

    @Test
    public void throwErrorForIsValidsearchVaultIdbyTokenWhenTokenAndReturnTypeIsMissing() throws ValidationException {
        List<TokenSearchRequest> tokenRequests = new ArrayList<>();
        TokenSearchRequest tokenRequest1 = getTokenSearchRequest("", 0, "");
        TokenSearchRequest tokenRequest2 = getTokenSearchRequest("", 1, "4489951947255128");
        tokenRequests.add(tokenRequest1);
        tokenRequests.add(tokenRequest2);

        ValidationException exception = assertThrows(ValidationException.class, () -> {
            vaultEntryServiceValidator.isValidsearchVaultIdbyToken(tokenRequests);
        });
        String expectedMessage = ErrorEntityCodes.INPUT_DATA_MISSING_FOR_VAULTID;
        String actualMessage = exception.getMessage();
        assertTrue(actualMessage.contains(expectedMessage));
        assertEquals(0, exception.getIndex());
    }

    private List<VaultRequest> getVaultRequestForCreditCardNumbers(List<String> creditCardNumbers) {
        List<VaultRequest> vaultRequests = new ArrayList<>();
        int index = 0;
        for (String creditCardNumber : creditCardNumbers) {
            VaultRequest vaultRequest = VaultRequest.builder()
                    .type(VaultConstants.DATA_TYPE_CREDIT_CARD_NUMBER)
                    .index(index++)
                    .plaintext(creditCardNumber)
                    .build();
            vaultRequests.add(vaultRequest);
        }


        return vaultRequests;
    }

    private TokenSearchRequest getTokenSearchRequest(String returnType, int index, String token) {
        return TokenSearchRequest.builder()
                .returnType(returnType)
                .index(index)
                .token(token)
                .build();
    }
}
