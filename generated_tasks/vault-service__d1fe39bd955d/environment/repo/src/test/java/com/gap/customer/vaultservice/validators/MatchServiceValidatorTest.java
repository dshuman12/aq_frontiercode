package com.gap.customer.vaultservice.validators;

import com.gap.customer.vaultservice.Validators.MatchServiceValidator;
import com.gap.customer.vaultservice.error.ErrorEntityCodes;
import com.gap.customer.vaultservice.exception.ValidationException;
import com.gap.customer.vaultservice.models.MatchRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.MockitoAnnotations;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class MatchServiceValidatorTest {

    private MatchServiceValidator MatchServiceValidator;

    @BeforeEach
    public void setUp() {
        MockitoAnnotations.openMocks(this);
        MatchServiceValidator = new MatchServiceValidator();
    }

    @Test
    void shouldReturnTrueWhenValidMatchRequestIsGiven() throws ValidationException {
        MatchRequest matchRequest = MatchRequest.builder().type("PASSWORD").plaintext("testPassword").vaultId("4H7995170925512744799517092551AA").build();

        boolean actualResponse = MatchServiceValidator.hasValidVaultPostRequests(matchRequest);

        assertTrue(actualResponse);
    }

    @Test
    void shouldThrowInputDataMissingForMatchWhenInputWithEmptyVaultIdIsGiven() {
        MatchRequest matchRequest = MatchRequest.builder().type("PASSWORD").plaintext("testPassword").vaultId(" ").build();

        ValidationException exception = assertThrows(ValidationException.class, () -> {
            MatchServiceValidator.hasValidVaultPostRequests(matchRequest);
        });

        String expectedMessage = ErrorEntityCodes.INPUT_DATA_MISSING_FOR_MATCH;
        String actualMessage = exception.getMessage();
        assertTrue(actualMessage.contains(expectedMessage));
    }

    @Test
    void shouldThrowInputDataMissingForMatchExceptionWhenVaultIdIsMissingInInput() {
        MatchRequest matchRequest = MatchRequest.builder().type("PASSWORD").plaintext("testPassword").build();

        ValidationException exception = assertThrows(ValidationException.class, () -> {
            MatchServiceValidator.hasValidVaultPostRequests(matchRequest);
        });

        String expectedMessage = ErrorEntityCodes.INPUT_DATA_MISSING_FOR_MATCH;
        String actualMessage = exception.getMessage();
        assertTrue(actualMessage.contains(expectedMessage));
    }

    @Test
    void shouldThrowInputDataMissingForMatchExceptionWhenPlainTextIsMissingInInput() {
        MatchRequest matchRequest = MatchRequest.builder().type("PASSWORD").vaultId("4H7995170925512744799517092551AA").build();

        ValidationException exception = assertThrows(ValidationException.class, () -> {
            MatchServiceValidator.hasValidVaultPostRequests(matchRequest);
        });

        String expectedMessage = ErrorEntityCodes.INPUT_DATA_MISSING_FOR_MATCH;
        String actualMessage = exception.getMessage();
        assertTrue(actualMessage.contains(expectedMessage));
    }

    @Test
    void shouldThrowInputDataMissingForMatchExceptionWhenDatatypeIsMissingInInput() {
        MatchRequest matchRequest = MatchRequest.builder().plaintext("testPassword").vaultId("4H7995170925512744799517092551AA").build();

        ValidationException exception = assertThrows(ValidationException.class, () -> {
            MatchServiceValidator.hasValidVaultPostRequests(matchRequest);
        });

        String expectedMessage = ErrorEntityCodes.INPUT_DATA_MISSING_FOR_MATCH;
        String actualMessage = exception.getMessage();
        assertTrue(actualMessage.contains(expectedMessage));
    }

    @Test
    void shouldThrowInvalidValueTypeForMatchExceptionWhenInputWithInvalidDatatypeIsGiven() {
        MatchRequest matchRequest = MatchRequest.builder().type("GIFT_CARD_NUMBER").plaintext("testPassword").vaultId("4H7995170925512744799517092551AA").build();

        ValidationException exception = assertThrows(ValidationException.class, () -> {
            MatchServiceValidator.hasValidVaultPostRequests(matchRequest);
        });

        String expectedMessage = ErrorEntityCodes.INVALID_VALUE_TYPE_FOR_MATCH;
        String actualMessage = exception.getMessage();
        assertTrue(actualMessage.contains(expectedMessage));
    }

    @Test
    void shouldThrowInvalidVaultIdExceptionWhenInputWithInvalidVaultIdIsGiven() {
        MatchRequest matchRequest = MatchRequest.builder().type("PASSWORD").plaintext("testPassword").vaultId("4H7995170925512744799517092551..").build();

        ValidationException exception = assertThrows(ValidationException.class, () -> {
            MatchServiceValidator.hasValidVaultPostRequests(matchRequest);
        });

        String expectedMessage = ErrorEntityCodes.INVALID_VAULT_ID;
        String actualMessage = exception.getMessage();
        assertTrue(actualMessage.contains(expectedMessage));
    }

    @Test
    void shouldThrowInvalidVaultIdLengthForMatchExceptionWhenVaultIdWithLengthMoreThan32IsGiven() {
        MatchRequest matchRequest = MatchRequest.builder().type("PASSWORD").plaintext("testPassword").vaultId("4H7995170925512744799517092551AA12").build();

        ValidationException exception = assertThrows(ValidationException.class, () -> {
            MatchServiceValidator.hasValidVaultPostRequests(matchRequest);
        });

        String expectedMessage = ErrorEntityCodes.INVALID_VAULT_ID_LENGTH_WITH_MORE_INFO;
        String actualMessage = exception.getMessage();
        assertTrue(actualMessage.contains(expectedMessage));
    }

    @Test
    void shouldThrowInputDatMissingForMatchExceptionWhenEmptyRequestIsGiven() {
        MatchRequest matchRequest = null;

        ValidationException exception = assertThrows(ValidationException.class, () -> {
            MatchServiceValidator.hasValidVaultPostRequests(matchRequest);
        });

        String expectedMessage = ErrorEntityCodes.INPUT_DATA_MISSING;
        String actualMessage = exception.getMessage();
        assertTrue(actualMessage.contains(expectedMessage));
    }

}