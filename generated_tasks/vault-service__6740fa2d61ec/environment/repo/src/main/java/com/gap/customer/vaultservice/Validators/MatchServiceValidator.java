package com.gap.customer.vaultservice.Validators;

import com.gap.customer.vaultservice.error.ErrorEntityCodes;
import com.gap.customer.vaultservice.exception.ValidationException;
import com.gap.customer.vaultservice.models.MatchRequest;
import com.gap.customer.vaultservice.util.VaultConstants;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang.StringUtils;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class MatchServiceValidator {

    public boolean hasValidVaultPostRequests(MatchRequest matchRequest) throws ValidationException {
        if (isMatchRequestNotEmpty(matchRequest)) {
            hasValidVaultPostInputRequest(matchRequest);
            hasValidType(matchRequest);
            validateVaultIdData(matchRequest);
        }
        return true;
    }

    private void hasValidType(MatchRequest matchRequest) throws ValidationException {
        if (!matchRequest.getType().equals(VaultConstants.DATA_TYPE_PASSWORD)) {
            throw new ValidationException(ErrorEntityCodes.INVALID_VALUE_TYPE_FOR_MATCH);
        }
    }

    public void validateVaultIdData(MatchRequest request) throws ValidationException {
        if (!StringUtils.isAlphanumeric(request.getVaultId())) {
            throw new ValidationException(ErrorEntityCodes.INVALID_VAULT_ID);
        }
        if (request.getVaultId().length() > VaultConstants.INPUT_DATA_MAX_LEN) {
            throw new ValidationException(ErrorEntityCodes.INVALID_VAULT_ID_LENGTH_WITH_MORE_INFO);
        }
    }

    private boolean isMatchRequestNotEmpty(MatchRequest request) throws ValidationException {
        if (request == null) {
            throw new ValidationException(ErrorEntityCodes.INPUT_DATA_MISSING);
        }
        return true;
    }

    private void hasValidVaultPostInputRequest(MatchRequest matchRequest) throws ValidationException {
        if (StringUtils.isBlank(matchRequest.getPlaintext()) || StringUtils.isBlank(matchRequest.getType())
                || StringUtils.isBlank(matchRequest.getVaultId())) {
            throw new ValidationException(ErrorEntityCodes.INPUT_DATA_MISSING_FOR_MATCH);
        }
    }
}
