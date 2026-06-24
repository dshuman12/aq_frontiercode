package com.gap.customer.vaultservice.validators;

import com.gap.customer.vaultservice.Validators.VaultEntryServiceValidatorUtil;
import com.gap.customer.vaultservice.Validators.VaultServiceCreditCardValidator;
import com.gap.customer.vaultservice.Validators.VaultServiceGiftCardValidator;
import com.gap.customer.vaultservice.exception.ValidationException;
import com.gap.customer.vaultservice.models.VaultRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.junit.jupiter.SpringExtension;

import static org.assertj.core.api.Assertions.assertThatExceptionOfType;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(SpringExtension.class)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
public class VaultEntryServiceValidatorUtilTest {

    @Mock
    private VaultServiceCreditCardValidator vaultServiceCreditCardValidator;

    @Mock
    private VaultServiceGiftCardValidator vaultServiceGiftCardValidator;

    private VaultEntryServiceValidatorUtil vaultEntryServiceValidatorUtil;

    @BeforeEach
    public void setUp() {
        MockitoAnnotations.openMocks(this);
        vaultEntryServiceValidatorUtil = new VaultEntryServiceValidatorUtil(vaultServiceCreditCardValidator, vaultServiceGiftCardValidator);
    }

    @Test
    public void shouldReturnTrueForValidCreditCardRequest() throws ValidationException {
        VaultRequest vaultRequest = VaultRequest.builder().index(0).type("CREDIT_CARD_NUMBER").plaintext("4479951709255127").build();
        when(vaultServiceCreditCardValidator.hasValidCreditCardNumber(any(VaultRequest.class), any(String.class))).thenReturn(true);

        boolean hasValidPostRequest = vaultEntryServiceValidatorUtil.hasValidatePostRequests(vaultRequest, "VaultTests");

        assertTrue(hasValidPostRequest);
    }

    @Test
    public void shouldReturnTrueForValidCreditCardExpiryMonth() throws ValidationException {
        VaultRequest vaultRequest = VaultRequest.builder().index(0).type("CREDIT_CARD_EXPIRY_MONTH").plaintext("12").build();
        when(vaultServiceCreditCardValidator.hasValidCreditCardMonth(any(VaultRequest.class))).thenReturn(true);

        boolean hasValidPostRequest = vaultEntryServiceValidatorUtil.hasValidatePostRequests(vaultRequest, "VaultTests");

        assertTrue(hasValidPostRequest);
    }

    @Test
    public void shouldReturnTrueForValidCreditCardExpiryYear() throws ValidationException {
        VaultRequest vaultRequest = VaultRequest.builder().index(0).type("CREDIT_CARD_EXPIRY_YEAR").plaintext("2030").build();
        when(vaultServiceCreditCardValidator.hasValidCreditCardYear(any(VaultRequest.class))).thenReturn(true);

        boolean hasValidPostRequest = vaultEntryServiceValidatorUtil.hasValidatePostRequests(vaultRequest, "VaultTests");

        assertTrue(hasValidPostRequest);
    }

    @Test
    public void shouldReturnTrueForValidGiftCardCardRequest() throws ValidationException {
        VaultRequest vaultRequest = VaultRequest.builder().index(0).type("GIFT_CARD_NUMBER").plaintext("447998951709255127").build();
        when(vaultServiceGiftCardValidator.hasValidGiftCardNumber(any(VaultRequest.class))).thenReturn(true);

        boolean hasValidPostRequest = vaultEntryServiceValidatorUtil.hasValidatePostRequests(vaultRequest, "VaultTests");

        assertTrue(hasValidPostRequest);
    }

    @Test
    public void shouldReturnTrueForValidGiftCardPinRequest() throws ValidationException {
        VaultRequest vaultRequest = VaultRequest.builder().index(0).type("GIFT_CARD_PIN").plaintext("34567").build();
        when(vaultServiceGiftCardValidator.hasValidGiftCardPin(any(VaultRequest.class))).thenReturn(true);

        boolean hasValidPostRequest = vaultEntryServiceValidatorUtil.hasValidatePostRequests(vaultRequest, "VaultTests");

        assertTrue(hasValidPostRequest);
    }

    @Test
    public void shouldReturnTrueForValidGiftCardTrack2Request() throws ValidationException {
        VaultRequest vaultRequest = VaultRequest.builder().index(0).type("GIFT_CARD_TRACK2").plaintext("4479951709255127").build();
        when(vaultServiceGiftCardValidator.hasValidGiftCardTrackTwo(any(VaultRequest.class))).thenReturn(true);

        boolean hasValidPostRequest = vaultEntryServiceValidatorUtil.hasValidatePostRequests(vaultRequest, "VaultTests");

        assertTrue(hasValidPostRequest);
    }

    @Test
    public void shouldThrowInvalidDataTypeException() {
        VaultRequest vaultRequest = VaultRequest.builder().index(0).type("TOKEN").plaintext("4479951709255127").build();

        ValidationException validationException = assertThrows(ValidationException.class, () ->
                vaultEntryServiceValidatorUtil.hasValidatePostRequests(vaultRequest, "VaultTests"));

        assertEquals("1", validationException.getMessage());
        assertEquals(0, validationException.getIndex());
    }

    @Test
    public void returnTrueForHasValidVaultPostRequestsForTokenEntries() throws ValidationException {

        VaultRequest vaultRequest = VaultRequest.builder().index(0).type("CREDIT_CARD_NUMBER").plaintext("4479951709255127").build();
        when(vaultServiceCreditCardValidator.hasValidCreditCardNumber(any(VaultRequest.class), any(String.class))).thenReturn(true);

        boolean result = vaultEntryServiceValidatorUtil.hasValidatePostRequestsForTokenEntries(vaultRequest, "VaultTests");

        assertTrue(result);
    }

    @Test
    public void shouldThrowInvalidDataTypeExceptionForVaultPostRequestsForTokenEntries() throws ValidationException {

        VaultRequest vaultRequest = VaultRequest.builder().type("TOKEN").index(0).plaintext("4479951709255127").build();

        ValidationException exception = assertThrows(ValidationException.class, () ->
                vaultEntryServiceValidatorUtil.hasValidatePostRequestsForTokenEntries(vaultRequest, "VaultTests"));


        assertEquals("1", exception.getMessage());
        assertEquals(0, exception.getIndex());
    }

    @Test
    public void shouldThrowInvalidCreditCardNumberExceptionForVaultPostRequestForTokenEntries() throws ValidationException {
        VaultRequest vaultRequest = VaultRequest.builder().type("CREDIT_CARD_NUMBER").index(0).plaintext("4479951709").build();
        when(vaultServiceCreditCardValidator.hasValidCreditCardNumber(any(VaultRequest.class), any(String.class))).thenThrow(new ValidationException());

        assertThatExceptionOfType(ValidationException.class).isThrownBy(() ->
                vaultEntryServiceValidatorUtil.hasValidatePostRequestsForTokenEntries(vaultRequest, "VaultTests"));
    }
}
