package com.gap.customer.vaultservice.Validators.Impl;

import com.gap.customer.vaultservice.Validators.SearchValidators;
import com.gap.customer.vaultservice.error.ErrorEntityCodes;
import com.gap.customer.vaultservice.exception.ValidationException;
import com.gap.customer.vaultservice.models.VaultSearchRequest;
import com.gap.customer.vaultservice.util.VaultConstants;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang.StringUtils;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
@Slf4j
public class SearchValidatorsImpl implements SearchValidators {

    private static final Map<String, String> requestValidateTypeMap = createRequestValidateTypeMap();

    private static Map<String, String> createRequestValidateTypeMap() {
        HashMap<String, String> formatTypeMap = new HashMap<>();
        formatTypeMap.put("GIFT_CARD_NUMBER", "GIFT_CARD_NUMBER");
        formatTypeMap.put("GIFT_CARD_PIN", "GIFT_CARD_PIN");
        formatTypeMap.put("CREDIT_CARD_EXPIRY_YEAR", "CREDIT_CARD_EXPIRY_YEAR");
        formatTypeMap.put("CREDIT_CARD_EXPIRY_MONTH", "CREDIT_CARD_EXPIRY_MONTH");
        formatTypeMap.put("GIFT_CARD_TRACK2", "GIFT_CARD_TRACK2");
        formatTypeMap.put("PASSWORD", "PASSWORD");
        formatTypeMap.put("VAULT_ID", "VAULT_ID");
        formatTypeMap.put("TOKEN", "TOKEN");
        return Collections.unmodifiableMap(formatTypeMap);

    }

    @Override
    public void validateVaultSearchType(VaultSearchRequest request) throws ValidationException {
        if (!requestValidateTypeMap.containsKey(request.getReturnType()) || request.getReturnType().equalsIgnoreCase(VaultConstants.DATA_TYPE_CREDIT_CARD_NUMBER)) {
            throw new ValidationException(ErrorEntityCodes.INVALID_RETURN_TYPE, request.getIndex());
        }
    }

    @Override
    public void validateUniqueIndexes(int index, HashMap<Integer, Integer> uniqueIndexes) throws ValidationException {
        if (uniqueIndexes.containsKey(index)) {
            throw new ValidationException(ErrorEntityCodes.INDEXES_NOT_UNIQUE, index);
        }
        uniqueIndexes.put(index, index);
    }

    @Override
    public void validateVaultIdData(VaultSearchRequest request) throws ValidationException {
        if (!StringUtils.isAlphanumeric(request.getVaultId())) {
            throw new ValidationException(ErrorEntityCodes.INVALID_VAULT_ID, request.getIndex());
        }
        if (request.getVaultId().length() > VaultConstants.INPUT_DATA_MAX_LEN) {
            throw new ValidationException(ErrorEntityCodes.INVALID_VAULT_ID_LENGTH_WITH_MORE_INFO, request.getIndex());
        }
    }

    @Override
    public void validateVaultSearch(List<VaultSearchRequest> requests) throws ValidationException {
        HashMap<Integer, Integer> uniqueIndexes = new HashMap<>();
        if (requests != null && !requests.isEmpty()) {
            for (VaultSearchRequest request : requests) {
                vaultSearchRequestNotEmpty(request);
                validateVaultSearchType(request);
                validateUniqueIndexes(request.getIndex(), uniqueIndexes);
                validateVaultIdData(request);
            }
        } else {
            throw new ValidationException(ErrorEntityCodes.INVALID_VAULT_SEARCH);
        }
    }

}
