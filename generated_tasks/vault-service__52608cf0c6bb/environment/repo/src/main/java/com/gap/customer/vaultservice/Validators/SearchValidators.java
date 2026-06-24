package com.gap.customer.vaultservice.Validators;

import com.gap.customer.vaultservice.error.ErrorEntityCodes;
import com.gap.customer.vaultservice.exception.ValidationException;
import com.gap.customer.vaultservice.models.VaultSearchRequest;
import org.apache.commons.lang.StringUtils;

import java.util.HashMap;
import java.util.List;

public interface SearchValidators {

    void validateVaultSearchType(VaultSearchRequest requests) throws ValidationException;

    void validateUniqueIndexes(int index, HashMap<Integer, Integer> uniqueIndexes) throws ValidationException;

    void validateVaultIdData(VaultSearchRequest requests) throws ValidationException;

    void validateVaultSearch(List<VaultSearchRequest> requests) throws ValidationException;


    default void vaultSearchRequestNotEmpty(VaultSearchRequest request) throws ValidationException {
        if (request.getIndex() == null) {
            throw new ValidationException(ErrorEntityCodes.INVALID_VAULT_SEARCH);
        }
        if (StringUtils.isEmpty(request.getReturnType()) || (StringUtils.isEmpty(request.getVaultId()))) {
            throw new ValidationException(ErrorEntityCodes.INVALID_VAULT_SEARCH, request.getIndex());
        }
    }
}
