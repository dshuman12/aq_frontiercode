package com.gap.customer.vaultservice.validators;


import com.gap.customer.vaultservice.Validators.VaultServiceCreditCardValidator;
import com.gap.customer.vaultservice.error.ErrorEntityCodes;
import com.gap.customer.vaultservice.exception.ValidationException;
import com.gap.customer.vaultservice.models.VaultRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.MockitoAnnotations;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

public class VaultServiceCreditCardValidatorTest {

    private VaultServiceCreditCardValidator vaultServiceCreditCardValidator;

    @BeforeEach
    public void setUp() {
        MockitoAnnotations.openMocks(this);
        vaultServiceCreditCardValidator = new VaultServiceCreditCardValidator();
    }

    @Test
    public void returnTrueForHasValidCreditCardNumber() throws ValidationException {

        VaultRequest vaultRequestForCreditCardNumber = getCreditCardRequest("CREDIT_CARD_NUMBER", "4479951709255127");

        boolean result = vaultServiceCreditCardValidator.hasValidCreditCardNumber(vaultRequestForCreditCardNumber, "VaultTests");
        assertTrue(result);
    }

    @Test
    public void throwErrorForHasValidCreditCardNumberWhenDataTypeIsNotCreditCardNumber() {
        VaultRequest vaultRequest = VaultRequest.builder()
                .type("TOKEN")
                .index(0)
                .plaintext("4479951709255127")
                .build();


        ValidationException exception = assertThrows(ValidationException.class, () ->
                vaultServiceCreditCardValidator.hasValidCreditCardNumber(vaultRequest, "VaultTests"));
        String expectedMessage = ErrorEntityCodes.INVALID_VALUE_TYPE;
        String actualMessage = exception.getMessage();
        assertEquals(expectedMessage, actualMessage);
        assertEquals(0, exception.getIndex());
    }

    @Test
    public void throwErrorForHasValidCreditCardNumberWhenCreditCardNumberIsLessThan13() {
        VaultRequest vaultRequest = VaultRequest.builder()
                .type("CREDIT_CARD_NUMBER")
                .index(0)
                .plaintext("44799517092")
                .build();


        ValidationException exception = assertThrows(ValidationException.class, () ->
                vaultServiceCreditCardValidator.hasValidCreditCardNumber(vaultRequest, "VaultTests"));
        String expectedMessage = ErrorEntityCodes.INVALID_CREDIT_CARD_LENGTH;
        String actualMessage = exception.getMessage();
        assertEquals(expectedMessage, actualMessage);
        assertEquals(0, exception.getIndex());
    }

    @Test
    public void throwErrorForHasValidCreditCardNumberWhenCreditCardNumberIsMoreThan20() {
        VaultRequest vaultRequest = VaultRequest.builder()
                .type("CREDIT_CARD_NUMBER")
                .index(0)
                .plaintext("447995170925512712345678")
                .build();


        ValidationException exception = assertThrows(ValidationException.class, () ->
                vaultServiceCreditCardValidator.hasValidCreditCardNumber(vaultRequest, "VaultTests"));
        String expectedMessage = ErrorEntityCodes.INVALID_CREDIT_CARD_LENGTH;
        String actualMessage = exception.getMessage();
        assertEquals(expectedMessage, actualMessage);
        assertEquals(0, exception.getIndex());
    }

    @Test
    public void throwErrorForHasValidCreditCardNumberWhenCreditCardNumberIsNotNumeric() {
        VaultRequest vaultRequest = VaultRequest.builder()
                .type("CREDIT_CARD_NUMBER")
                .index(0)
                .plaintext("44799517092551AB")
                .build();


        ValidationException exception = assertThrows(ValidationException.class, () ->
                vaultServiceCreditCardValidator.hasValidCreditCardNumber(vaultRequest, "VaultTests"));
        String expectedMessage = ErrorEntityCodes.INVALID_CREDIT_CARD;
        String actualMessage = exception.getMessage();
        assertEquals(expectedMessage, actualMessage);
        assertEquals(0, exception.getIndex());
    }

    @Test
    void shouldReturnTrueForAValidateCreditCardExpiryYear() throws ValidationException {
        VaultRequest vaultRequest = getCreditCardRequest("CREDIT_CARD_EXPIRY_YEAR", "12");

        boolean validCreditCardExpiryYear = vaultServiceCreditCardValidator.hasValidCreditCardYear(vaultRequest);

        assertTrue(validCreditCardExpiryYear);
    }

    @Test
    void shouldThrowInvalidCreditCardYearDataTypeException() {
        VaultRequest vaultRequest = getCreditCardRequest("CREDIT_CARD_NUMBER", "12");
        String expectedMessage = ErrorEntityCodes.INVALID_CREDIT_CARD;

        ValidationException exception = assertThrows(ValidationException.class, () ->
                vaultServiceCreditCardValidator.hasValidCreditCardYear(vaultRequest));
        String actualMessage = exception.getMessage();

        assertEquals(expectedMessage, actualMessage);
        assertEquals(0, exception.getIndex());
    }

    @Test
    void shouldThrowCreditCardYearShouldBeNumericException() {
        VaultRequest vaultRequest = getCreditCardRequest("CREDIT_CARD_EXPIRY_YEAR", "A2");
        String expectedMessage = ErrorEntityCodes.INVALID_CREDIT_CARD;

        ValidationException exception = assertThrows(ValidationException.class, () ->
                vaultServiceCreditCardValidator.hasValidCreditCardYear(vaultRequest));
        String actualMessage = exception.getMessage();

        assertEquals(expectedMessage, actualMessage);
        assertEquals(0, exception.getIndex());
    }

    @Test
    void shouldThrowCreditCardYearLengthIsLessThan2Exception() {
        VaultRequest vaultRequest = getCreditCardRequest("CREDIT_CARD_EXPIRY_YEAR", "2");
        String expectedMessage = ErrorEntityCodes.INVALID_CREDIT_CARD_EXPIRY_YEAR_LENGTH;

        ValidationException exception = assertThrows(ValidationException.class, () ->
                vaultServiceCreditCardValidator.hasValidCreditCardYear(vaultRequest));
        String actualMessage = exception.getMessage();

        assertEquals(expectedMessage, actualMessage);
        assertEquals(0, exception.getIndex());
    }

    @Test
    void shouldThrowCreditCardYearLengthIsGreaterThan4Exception() {
        VaultRequest vaultRequest = getCreditCardRequest("CREDIT_CARD_EXPIRY_YEAR", "20334");
        String expectedMessage = ErrorEntityCodes.INVALID_CREDIT_CARD_EXPIRY_YEAR_LENGTH;

        ValidationException exception = assertThrows(ValidationException.class, () ->
                vaultServiceCreditCardValidator.hasValidCreditCardYear(vaultRequest));
        String actualMessage = exception.getMessage();

        assertEquals(expectedMessage, actualMessage);
        assertEquals(0, exception.getIndex());
    }

    @Test
    void shouldReturnTrueForAValidateCreditCardExpiryMonth() throws ValidationException {
        VaultRequest vaultRequest = getCreditCardRequest("CREDIT_CARD_EXPIRY_MONTH", "12");

        boolean validCreditCardExpiryYear = vaultServiceCreditCardValidator.hasValidCreditCardMonth(vaultRequest);

        assertTrue(validCreditCardExpiryYear);
    }

    @Test
    void shouldThrowInvalidCreditCardMonthDataTypeException() {
        VaultRequest vaultRequest = getCreditCardRequest("CREDIT_CARD_EXPIRY_YEAR", "12");
        String expectedMessage = ErrorEntityCodes.INVALID_CREDIT_CARD;

        ValidationException exception = assertThrows(ValidationException.class, () ->
                vaultServiceCreditCardValidator.hasValidCreditCardMonth(vaultRequest));
        String actualMessage = exception.getMessage();

        assertEquals(expectedMessage, actualMessage);
        assertEquals(0, exception.getIndex());
    }

    @Test
    void shouldThrowCreditCardMonthShouldBeNumericException() {
        VaultRequest vaultRequest = getCreditCardRequest("CREDIT_CARD_EXPIRY_MONTH", "A2");
        String expectedMessage = ErrorEntityCodes.INVALID_CREDIT_CARD;

        ValidationException exception = assertThrows(ValidationException.class, () ->
                vaultServiceCreditCardValidator.hasValidCreditCardMonth(vaultRequest));
        String actualMessage = exception.getMessage();

        assertEquals(expectedMessage, actualMessage);
        assertEquals(0, exception.getIndex());
    }

    @Test
    void shouldThrowCreditCardMonthLengthIsLessThan2Exception() {
        VaultRequest vaultRequest = getCreditCardRequest("CREDIT_CARD_EXPIRY_MONTH", "2");
        String expectedMessage = ErrorEntityCodes.INVALID_CREDIT_CARD_EXPIRY_MONTH_LENGTH;

        ValidationException exception = assertThrows(ValidationException.class, () ->
                vaultServiceCreditCardValidator.hasValidCreditCardMonth(vaultRequest));
        String actualMessage = exception.getMessage();

        assertEquals(expectedMessage, actualMessage);
        assertEquals(0, exception.getIndex());
    }

    @Test
    void shouldThrowCreditCardMonthLengthIsGreaterThan2Exception() {
        VaultRequest vaultRequest = getCreditCardRequest("CREDIT_CARD_EXPIRY_MONTH", "123");
        String expectedMessage = ErrorEntityCodes.INVALID_CREDIT_CARD_EXPIRY_MONTH_LENGTH;

        ValidationException exception = assertThrows(ValidationException.class, () ->
                vaultServiceCreditCardValidator.hasValidCreditCardMonth(vaultRequest));
        String actualMessage = exception.getMessage();

        assertEquals(expectedMessage, actualMessage);
        assertEquals(0, exception.getIndex());
    }

    @Test
    void shouldThrowCreditCardMonthShouldBeGreaterThan0Exception() {
        VaultRequest vaultRequest = getCreditCardRequest("CREDIT_CARD_EXPIRY_MONTH", "00");
        String expectedMessage = ErrorEntityCodes.INVALID_CREDIT_CARD_EXPIRY_MONTH;

        ValidationException exception = assertThrows(ValidationException.class, () ->
                vaultServiceCreditCardValidator.hasValidCreditCardMonth(vaultRequest));
        String actualMessage = exception.getMessage();

        assertEquals(expectedMessage, actualMessage);
        assertEquals(0, exception.getIndex());
    }

    @Test
    void shouldThrowCreditCardMonthShouldBeLessThan13Exception() {
        VaultRequest vaultRequest = getCreditCardRequest("CREDIT_CARD_EXPIRY_MONTH", "13");
        String expectedMessage = ErrorEntityCodes.INVALID_CREDIT_CARD_EXPIRY_MONTH;

        ValidationException exception = assertThrows(ValidationException.class, () ->
                vaultServiceCreditCardValidator.hasValidCreditCardMonth(vaultRequest));
        String actualMessage = exception.getMessage();

        assertEquals(expectedMessage, actualMessage);
        assertEquals(0, exception.getIndex());
    }

    private VaultRequest getCreditCardRequest(String dataTpe, String plainText) {
        return VaultRequest.builder().type(dataTpe).plaintext(plainText).index(0).build();
    }
}
