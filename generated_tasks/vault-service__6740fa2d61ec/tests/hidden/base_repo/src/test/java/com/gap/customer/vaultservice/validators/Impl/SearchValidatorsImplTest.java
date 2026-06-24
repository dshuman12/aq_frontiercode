package com.gap.customer.vaultservice.validators.Impl;


import com.gap.customer.vaultservice.Validators.Impl.SearchValidatorsImpl;
import com.gap.customer.vaultservice.Validators.SearchValidators;
import com.gap.customer.vaultservice.error.ErrorEntityCodes;
import com.gap.customer.vaultservice.exception.ValidationException;
import com.gap.customer.vaultservice.models.VaultSearchRequest;
import com.gap.customer.vaultservice.util.VaultConstants;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static java.util.Arrays.asList;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class SearchValidatorsImplTest {

    private SearchValidators searchValidators;

    @BeforeEach
    public void setUp() {
        searchValidators = new SearchValidatorsImpl();
    }

    @Test
    public void shouldNotThrowForValidateVaultSearchType() throws Exception {
        VaultSearchRequest vaultSearchRequest = VaultSearchRequest.builder().vaultId("A34E03534598349813490353459F3498")
                .index(0).returnType(VaultConstants.DATA_TYPE_GIFT_CARD_NUMBER).build();

        assertDoesNotThrow(() -> searchValidators.validateVaultSearch(List.of(vaultSearchRequest)));
    }

    @Test
    public void shouldThrowForValidateVaultSearchTypeForEmptyRequest() throws Exception {
        ValidationException exception = assertThrows(ValidationException.class, () -> searchValidators.validateVaultSearch(new ArrayList<>()));

        String expectedErrorMessage = ErrorEntityCodes.INVALID_VAULT_SEARCH;
        assertEquals(expectedErrorMessage, exception.getMessage());
    }

    @Test
    public void shouldThrowForValidateVaultSearchTypeForEmptyReturnType() throws Exception {
        VaultSearchRequest vaultSearchRequest = VaultSearchRequest.builder().vaultId("A34E03534598349813490353459F3498")
                .index(0).build();

        ValidationException exception = assertThrows(ValidationException.class, () -> searchValidators.validateVaultSearch(List.of(vaultSearchRequest)));

        String expectedErrorMessage = ErrorEntityCodes.INVALID_VAULT_SEARCH;
        assertEquals(expectedErrorMessage, exception.getMessage());
    }

    @Test
    public void shouldThrowForValidateVaultSearchTypeForEmptyIndex() throws Exception {
        VaultSearchRequest vaultSearchRequest = VaultSearchRequest.builder().vaultId("A34E03534598349813490353459F3498")
                .returnType(VaultConstants.DATA_TYPE_GIFT_CARD_NUMBER).build();

        ValidationException exception = assertThrows(ValidationException.class, () -> searchValidators.validateVaultSearch(List.of(vaultSearchRequest)));

        String expectedErrorMessage = ErrorEntityCodes.INVALID_VAULT_SEARCH;
        assertEquals(expectedErrorMessage, exception.getMessage());
    }

    @Test
    public void shouldThrowForValidateVaultSearchTypeForEmptyVaultId() throws Exception {
        VaultSearchRequest vaultSearchRequest = VaultSearchRequest.builder().index(0)
                .returnType(VaultConstants.DATA_TYPE_GIFT_CARD_NUMBER).build();

        ValidationException exception = assertThrows(ValidationException.class, () -> searchValidators.validateVaultSearch(List.of(vaultSearchRequest)));

        String expectedErrorMessage = ErrorEntityCodes.INVALID_VAULT_SEARCH;
        assertEquals(expectedErrorMessage, exception.getMessage());
    }

    @Test
    public void shouldThrowForValidateVaultSearchTypeForInvalidReturnType() throws Exception {
        VaultSearchRequest vaultSearchRequest = VaultSearchRequest.builder().vaultId("A34E03534598349813490353459F3498")
                .index(0).returnType("GiftCardNumber").build();

        ValidationException exception = assertThrows(ValidationException.class, () -> searchValidators.validateVaultSearch(List.of(vaultSearchRequest)));

        String expectedErrorMessage = ErrorEntityCodes.INVALID_RETURN_TYPE;
        assertEquals(expectedErrorMessage, exception.getMessage());
    }

    @Test
    public void shouldThrowForValidateVaultSearchTypeForCreditCardNumberReturnType() throws Exception {
        VaultSearchRequest vaultSearchRequest = VaultSearchRequest.builder().vaultId("A34E03534598349813490353459F3498")
                .index(0).returnType(VaultConstants.DATA_TYPE_CREDIT_CARD_NUMBER).build();

        ValidationException exception = assertThrows(ValidationException.class, () -> searchValidators.validateVaultSearch(List.of(vaultSearchRequest)));

        String expectedErrorMessage = ErrorEntityCodes.INVALID_RETURN_TYPE;
        assertEquals(expectedErrorMessage, exception.getMessage());
    }

    @Test
    public void shouldThrowForValidateVaultSearchTypeForRepeatedIndexes() throws Exception {
        VaultSearchRequest vaultSearchRequest1 = VaultSearchRequest.builder()
                .vaultId("A34E03534598349813490353459F3498").index(0).returnType(VaultConstants.DATA_TYPE_GIFT_CARD_PIN)
                .build();
        VaultSearchRequest vaultSearchRequest2 = VaultSearchRequest.builder()
                .vaultId("B67E03534598349813490353459F3410").index(0).returnType(VaultConstants.DATA_TYPE_GIFT_CARD_PIN)
                .build();

        ValidationException exception = assertThrows(ValidationException.class, () -> searchValidators.validateVaultSearch(asList(vaultSearchRequest1, vaultSearchRequest2)));

        String expectedErrorMessage = ErrorEntityCodes.INDEXES_NOT_UNIQUE;
        assertEquals(expectedErrorMessage, exception.getMessage());
    }

    @Test
    public void shouldThrowForValidateVaultSearchTypeForInvalidVaultId() throws Exception {
        VaultSearchRequest vaultSearchRequest = VaultSearchRequest.builder()
                .vaultId("A34E0-534598-4981349-353459").index(0).returnType(VaultConstants.DATA_TYPE_GIFT_CARD_PIN)
                .build();

        ValidationException exception = assertThrows(ValidationException.class, () -> searchValidators.validateVaultSearch(List.of(vaultSearchRequest)));

        String expectedErrorMessage = ErrorEntityCodes.INVALID_VAULT_ID;
        assertEquals(expectedErrorMessage, exception.getMessage());
    }

    @Test
    public void shouldThrowForValidateVaultSearchTypeForInvalidVaultIdLenght() throws Exception {
        VaultSearchRequest vaultSearchRequest = VaultSearchRequest.builder().returnType(VaultConstants.DATA_TYPE_GIFT_CARD_PIN)
                .vaultId("B67E03534598349813490353459F3410B67E03534598349813490353459").index(0)
                .build();

        ValidationException exception = assertThrows(ValidationException.class, () -> searchValidators.validateVaultSearch(List.of(vaultSearchRequest)));

        String expectedErrorMessage = ErrorEntityCodes.INVALID_VAULT_ID_LENGTH_WITH_MORE_INFO;
        assertEquals(expectedErrorMessage, exception.getMessage());
    }
}