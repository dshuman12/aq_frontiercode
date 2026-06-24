package com.gap.customer.vaultservice.validators;

import com.gap.customer.vaultservice.Validators.LookUpValidator;
import com.gap.customer.vaultservice.exception.ValidationException;
import com.gap.customer.vaultservice.models.LookUpData;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.springframework.test.context.junit.jupiter.SpringExtension;

import java.util.ArrayList;

import static com.gap.customer.vaultservice.util.VaultConstants.AZURE_DB_TIMEOUT;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

@ExtendWith(SpringExtension.class)
class LookUpValidatorTest {

    private static final String BLUEFIN = "BLUEFIN";
    private static final String LEGACY = "LEGACY";

    @InjectMocks
    private LookUpValidator lookUpValidator;

    @Test
    void shouldValidateLookUpData() {
        ArrayList<LookUpData> lookUpData = new ArrayList<>();
        lookUpData.add(LookUpData.builder().lookupKey(BLUEFIN).lookupValue("true").build());
        lookUpData.add(LookUpData.builder().lookupKey(AZURE_DB_TIMEOUT).lookupValue("10").build());
        lookUpData.add(LookUpData.builder().lookupKey(LEGACY).lookupValue("true").build());

        assertDoesNotThrow(() -> lookUpValidator.validate(lookUpData));
    }

    @Test
    void shouldValidateLookUpDataForDBFlags() {
        ArrayList<LookUpData> lookUpData = new ArrayList<>();
        lookUpData.add(LookUpData.builder().lookupKey(AZURE_DB_TIMEOUT).lookupValue("2000").build());
        lookUpData.add(LookUpData.builder().lookupKey(AZURE_DB_TIMEOUT).lookupValue("false").build());

        assertDoesNotThrow(() -> lookUpValidator.validate(lookUpData));
    }

    @Test
    void shouldThrowExceptionForEmptyFlag() {
        ArrayList<LookUpData> lookUpData = new ArrayList<>();
        lookUpData.add(LookUpData.builder().lookupKey(BLUEFIN).lookupValue("true").build());
        lookUpData.add(LookUpData.builder().lookupKey("").lookupValue("false").build());
        lookUpData.add(LookUpData.builder().lookupKey(LEGACY).lookupValue("true").build());
        String expectedCode = "32";

        ValidationException actualException = assertThrows(ValidationException.class, () ->
                lookUpValidator.validate(lookUpData));

        assertEquals(expectedCode, actualException.getMessage());
    }

    @Test
    void shouldThrowExceptionForEmptyStatus() {
        ArrayList<LookUpData> lookUpData = new ArrayList<>();
        lookUpData.add(LookUpData.builder().lookupKey(BLUEFIN).lookupValue("true").build());
        lookUpData.add(LookUpData.builder().lookupKey(AZURE_DB_TIMEOUT).build());
        lookUpData.add(LookUpData.builder().lookupKey(LEGACY).lookupValue("true").build());
        String expectedCode = "32";

        ValidationException actualException = assertThrows(ValidationException.class, () ->
                lookUpValidator.validate(lookUpData));

        assertEquals(expectedCode, actualException.getMessage());
    }

    @Test
    void shouldThrowExceptionForInvalidFlag() {
        ArrayList<LookUpData> lookUpData = new ArrayList<>();
        lookUpData.add(LookUpData.builder().lookupKey("BLUFIN").lookupValue("true").build());
        lookUpData.add(LookUpData.builder().lookupKey(AZURE_DB_TIMEOUT).build());
        lookUpData.add(LookUpData.builder().lookupKey(LEGACY).lookupValue("true").build());
        String expectedCode = "32";

        ValidationException actualException = assertThrows(ValidationException.class, () ->
                lookUpValidator.validate(lookUpData));

        assertEquals(expectedCode, actualException.getMessage());
    }
}