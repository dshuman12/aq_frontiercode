package com.gap.customer.vaultservice.validators;

import com.gap.customer.vaultservice.Validators.VaultServiceGiftCardValidator;
import com.gap.customer.vaultservice.error.ErrorEntityCodes;
import com.gap.customer.vaultservice.exception.ValidationException;
import com.gap.customer.vaultservice.models.VaultRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

public class VaultServiceGiftCardValidatorTest {

    private VaultServiceGiftCardValidator vaultServiceGiftCardValidator;

    @BeforeEach
    void setup() {
        vaultServiceGiftCardValidator = new VaultServiceGiftCardValidator();
    }

    @Test
    void shouldReturnTrueForAGivenValidGiftCardNumberRequest() throws ValidationException {
        VaultRequest vaultRequest = getVaultRequest("GIFT_CARD_NUMBER", "1234567890123456");
        boolean validGiftCardNumber = vaultServiceGiftCardValidator.hasValidGiftCardNumber(vaultRequest);
        assertTrue(validGiftCardNumber);
    }

    @Test
    void shouldThrowInvalidDataTypeExceptionForHasValidGiftCardNumber() {
        VaultRequest vaultRequest = getVaultRequest("GIFT_CARD_PIN", "1234567890123456");
        String expectedErrorMessage = ErrorEntityCodes.INVALID_GIFT_CARD;

        ValidationException validationException = assertThrows(ValidationException.class, () ->
                vaultServiceGiftCardValidator.hasValidGiftCardNumber(vaultRequest));
        String actualErrorMessage = validationException.getMessage();

        assertEquals(expectedErrorMessage, actualErrorMessage);
        assertEquals(0, validationException.getIndex());
    }

    @Test
    void shouldThrowGiftCardNumberShouldContainOnlyNumericValuesException() {
        VaultRequest vaultRequest = getVaultRequest("GIFT_CARD_NUMBER", "123456AB7890123456");
        String expectedErrorMessage = ErrorEntityCodes.INVALID_GIFT_CARD;

        ValidationException validationException = assertThrows(ValidationException.class, () ->
                vaultServiceGiftCardValidator.hasValidGiftCardNumber(vaultRequest));
        String actualErrorMessage = validationException.getMessage();

        assertEquals(expectedErrorMessage, actualErrorMessage);
        assertEquals(0, validationException.getIndex());
    }

    @Test
    void shouldThrowGiftCardNumberLengthShouldNotBeLessThan16Exception() {
        VaultRequest vaultRequest = getVaultRequest("GIFT_CARD_NUMBER", "123456789098765");
        String expectedErrorMessage = ErrorEntityCodes.INVALID_GIFT_CARD_LENGTH;

        ValidationException validationException = assertThrows(ValidationException.class, () ->
                vaultServiceGiftCardValidator.hasValidGiftCardNumber(vaultRequest));
        String actualErrorMessage = validationException.getMessage();

        assertEquals(expectedErrorMessage, actualErrorMessage);
        assertEquals(0, validationException.getIndex());
    }

    @Test
    void shouldThrowGiftCardNumberLengthShouldNotBeGreaterThan20Exception() {
        VaultRequest vaultRequest = getVaultRequest("GIFT_CARD_NUMBER", "123456789012345678901");
        String expectedErrorMessage = ErrorEntityCodes.INVALID_GIFT_CARD_LENGTH;

        ValidationException validationException = assertThrows(ValidationException.class, () ->
                vaultServiceGiftCardValidator.hasValidGiftCardNumber(vaultRequest));
        String actualErrorMessage = validationException.getMessage();

        assertEquals(expectedErrorMessage, actualErrorMessage);
        assertEquals(0, validationException.getIndex());
    }

    @Test
    void shouldReturnTrueForAGivenValidGiftCardPinRequest() throws ValidationException {
        VaultRequest vaultRequest = getVaultRequest("GIFT_CARD_PIN", "1234");
        boolean validGiftCardNumber = vaultServiceGiftCardValidator.hasValidGiftCardPin(vaultRequest);
        assertTrue(validGiftCardNumber);
    }

    @Test
    void shouldThrowInvalidDataTypeExceptionForHasValidGiftCardPin() {
        VaultRequest vaultRequest = getVaultRequest("GIFT_CARD_NUMBER", "1234");
        String expectedErrorMessage = ErrorEntityCodes.INVALID_GIFT_CARD_PIN;

        ValidationException validationException = assertThrows(ValidationException.class, () ->
                vaultServiceGiftCardValidator.hasValidGiftCardPin(vaultRequest));
        String actualErrorMessage = validationException.getMessage();

        assertEquals(expectedErrorMessage, actualErrorMessage);
        assertEquals(0, validationException.getIndex());
    }

    @Test
    void shouldThrowGiftCardPinShouldContainOnlyNumericValuesException() {
        VaultRequest vaultRequest = getVaultRequest("GIFT_CARD_PIN", "123A");
        String expectedErrorMessage = ErrorEntityCodes.INVALID_GIFT_CARD_PIN;

        ValidationException validationException = assertThrows(ValidationException.class, () ->
                vaultServiceGiftCardValidator.hasValidGiftCardPin(vaultRequest));
        String actualErrorMessage = validationException.getMessage();

        assertEquals(expectedErrorMessage, actualErrorMessage);
        assertEquals(0, validationException.getIndex());
    }

    @Test
    void shouldThrowGiftCardPinLengthShouldNotBeLessThan2Exception() {
        VaultRequest vaultRequest = getVaultRequest("GIFT_CARD_PIN", "1");
        String expectedErrorMessage = ErrorEntityCodes.INVALID_GIFT_CARD_PIN_LENGTH;

        ValidationException validationException = assertThrows(ValidationException.class, () ->
                vaultServiceGiftCardValidator.hasValidGiftCardPin(vaultRequest));
        String actualErrorMessage = validationException.getMessage();

        assertEquals(expectedErrorMessage, actualErrorMessage);
        assertEquals(0, validationException.getIndex());
    }

    @Test
    void shouldThrowGiftCardPinLengthShouldNotBeGreaterThan20Exception() {
        VaultRequest vaultRequest = getVaultRequest("GIFT_CARD_PIN", "123456789012345678901");
        String expectedErrorMessage = ErrorEntityCodes.INVALID_GIFT_CARD_PIN_LENGTH;

        ValidationException validationException = assertThrows(ValidationException.class, () ->
                vaultServiceGiftCardValidator.hasValidGiftCardPin(vaultRequest));
        String actualErrorMessage = validationException.getMessage();

        assertEquals(expectedErrorMessage, actualErrorMessage);
        assertEquals(0, validationException.getIndex());
    }

    @Test
    void shouldReturnTrueForAGivenValidGiftCardTrack2Request() throws ValidationException {
        VaultRequest vaultRequest = getVaultRequest("GIFT_CARD_TRACK2", "1234567890123456");
        boolean validGiftCardNumber = vaultServiceGiftCardValidator.hasValidGiftCardTrackTwo(vaultRequest);
        assertTrue(validGiftCardNumber);
    }

    @Test
    void shouldThrowGiftCardTrackTwoLengthShouldNotBeLessThan16Exception() {
        VaultRequest vaultRequest = getVaultRequest("GIFT_CARD_TRACK2", "123456789012345");
        String expectedErrorMessage = ErrorEntityCodes.INVALID_GIFT_CARD_TRACK2_LENGTH;

        ValidationException validationException = assertThrows(ValidationException.class, () ->
                vaultServiceGiftCardValidator.hasValidGiftCardTrackTwo(vaultRequest));
        String actualErrorMessage = validationException.getMessage();

        assertEquals(expectedErrorMessage, actualErrorMessage);
        assertEquals(0, validationException.getIndex());
    }

    @Test
    void shouldThrowGiftCardTrackTwoLengthShouldNotBeGreaterThan64Exception() {
        String plainText = "12345678901234567890123456789012345678901234567890123456789012345";
        VaultRequest vaultRequest = getVaultRequest("GIFT_CARD_TRACK2", plainText);
        String expectedErrorMessage = ErrorEntityCodes.INVALID_GIFT_CARD_TRACK2_LENGTH;

        ValidationException validationException = assertThrows(ValidationException.class, () ->
                vaultServiceGiftCardValidator.hasValidGiftCardTrackTwo(vaultRequest));
        String actualErrorMessage = validationException.getMessage();

        assertEquals(expectedErrorMessage, actualErrorMessage);
        assertEquals(0, validationException.getIndex());
    }

    private VaultRequest getVaultRequest(String dataType, String plainText) {
        return VaultRequest.builder().index(0).type(dataType).plaintext(plainText).build();
    }
}
