package com.gap.customer.vaultservice.Validators;

import com.gap.customer.vaultservice.error.ErrorEntityCodes;
import com.gap.customer.vaultservice.exception.ValidationException;
import com.gap.customer.vaultservice.models.TokenRequest;
import com.gap.customer.vaultservice.models.TokenSearchRequest;
import com.gap.customer.vaultservice.models.VaultRequest;
import com.gap.customer.vaultservice.util.VaultConstants;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang.StringUtils;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;

import static com.gap.customer.vaultservice.util.VaultConstants.TOKEN_DATA_MAX_LEN;
import static com.gap.customer.vaultservice.util.VaultConstants.TOKEN_DATA_MIN_LEN;

@Slf4j
@Component
@RequiredArgsConstructor
public class VaultEntryServiceValidator {

    private final VaultEntryServiceValidatorUtil vaultEntryServiceValidatorUtil;
    private final VaultServiceCreditCardValidator vaultServiceCreditCardValidator;


    public void hasUniqueIndexes(int index, HashMap<Integer, Integer> uniqueIndexes) throws ValidationException {
        if (uniqueIndexes.containsKey(index)) {
            throw new ValidationException(ErrorEntityCodes.INDEXES_NOT_UNIQUE, index);
        }
        uniqueIndexes.put(index, index);
    }


    public boolean hasValidVaultPostRequests(List<VaultRequest> vaultRequests, String xAppName) throws ValidationException {
        HashMap<Integer, Integer> uniqueIndexes = new HashMap<Integer, Integer>();
        if (isVaultPostsRequestNotEmpty(vaultRequests)) {
            for (VaultRequest request : vaultRequests) {
                hasValidVaultPostInputRequest(request);
                hasUniqueIndexes(request.getIndex(), uniqueIndexes);
                vaultEntryServiceValidatorUtil.hasValidatePostRequests(request, xAppName);
            }
        }
        return true;
    }


    public boolean hasValidVaultPostRequestsForTokenEntries(List<VaultRequest> vaultRequests, String xAppName) throws ValidationException {
        HashMap<Integer, Integer> uniqueIndexes = new HashMap<>();
        if (isVaultPostsRequestNotEmpty(vaultRequests)) {
            for (VaultRequest request : vaultRequests) {
                hasValidVaultPostInputRequest(request);
                hasUniqueIndexes(request.getIndex(), uniqueIndexes);
                vaultEntryServiceValidatorUtil.hasValidatePostRequestsForTokenEntries(request, xAppName);
            }
        }
        return true;
    }

    public boolean hasValidVaultPostRequestsForLegacy(List<VaultRequest> vaultRequests, String xAppName) throws ValidationException {
        HashMap<Integer, Integer> uniqueIndexes = new HashMap<Integer, Integer>();
        if (isVaultPostsRequestNotEmpty(vaultRequests)) {
            for (VaultRequest request : vaultRequests) {
                hasValidVaultPostInputRequest(request);
                hasUniqueIndexes(request.getIndex(), uniqueIndexes);
                vaultServiceCreditCardValidator.hasValidCreditCardNumber(request, xAppName);
            }
        }
        return true;
    }


    private boolean isVaultPostsRequestNotEmpty(List<VaultRequest> requests) throws ValidationException {
        if (requests == null || requests.isEmpty()) {
            throw new ValidationException(ErrorEntityCodes.INPUT_DATA_MISSING);
        }
        return true;
    }

    private boolean hasValidVaultPostInputRequest(VaultRequest vaultRequest) throws ValidationException {
        if (vaultRequest.getIndex() == null) {
            throw new ValidationException(ErrorEntityCodes.INPUT_DATA_MISSING);
        }
        if (StringUtils.isEmpty(vaultRequest.getPlaintext()) || StringUtils.isEmpty(vaultRequest.getType())) {
            throw new ValidationException(ErrorEntityCodes.INPUT_DATA_MISSING, vaultRequest.getIndex());
        }
        return true;
    }


    public boolean hasValidTokenRequest(List<TokenRequest> tokenRequests) throws ValidationException {
        HashMap<Integer, Integer> uniqueIndexes = new HashMap<Integer, Integer>();
        if (isTokenRequestNotEmpty(tokenRequests)) {
            for (TokenRequest request : tokenRequests) {
                hasValidTokenInputRequest(request);
                hasUniqueIndexes(request.getIndex(), uniqueIndexes);
                isValidTokenRequest(request);
            }
        }
        return true;
    }

    private boolean isTokenRequestNotEmpty(List<TokenRequest> requests) throws ValidationException {
        if (requests == null || requests.isEmpty()) {
            throw new ValidationException(ErrorEntityCodes.INPUT_DATA_MISSING);
        }
        return true;
    }

    private boolean isSearchVaultIdbyTokenNotEmpty(List<TokenSearchRequest> requests) throws ValidationException {
        if (requests == null || requests.isEmpty()) {
            throw new ValidationException(ErrorEntityCodes.INPUT_DATA_MISSING);
        }
        return true;
    }

    private void hasValidTokenInputRequest(TokenRequest tokenRequest) throws ValidationException {
        if (tokenRequest.getIndex() == null) {
            throw new ValidationException(ErrorEntityCodes.INPUT_DATA_MISSING);
        }
        if (StringUtils.isEmpty(tokenRequest.getData()) || StringUtils.isEmpty(tokenRequest.getType())) {

            throw new ValidationException(ErrorEntityCodes.INPUT_DATA_MISSING, tokenRequest.getIndex());
        }
    }

    private void isValidTokenRequest(TokenRequest tokenRequest) throws ValidationException {
        if (!VaultConstants.DATA_TYPE_VAULT_ID.equalsIgnoreCase(tokenRequest.getType())) {
            throw new ValidationException(ErrorEntityCodes.INVALID_VALUE_TYPE, tokenRequest.getIndex());
        }
        if (!StringUtils.isAlphanumeric(tokenRequest.getData())) {
            throw new ValidationException(ErrorEntityCodes.INVALID_VAULT_ID, tokenRequest.getIndex());
        }
        if (tokenRequest.getData().length() > 32) {
            throw new ValidationException(ErrorEntityCodes.INVALID_VAULT_ID_LENGTH, tokenRequest.getIndex());
        }
    }

    public boolean isValidsearchVaultIdbyToken(List<TokenSearchRequest> tokenSearchRequest) throws ValidationException {
        HashMap<Integer, Integer> uniqueIndexes = new HashMap<Integer, Integer>();
        if (isSearchVaultIdbyTokenNotEmpty(tokenSearchRequest)) {
            for (TokenSearchRequest request : tokenSearchRequest) {
                hasSearchVaultIdbyTokenInputRequest(request);
                hasUniqueIndexes(request.getIndex(), uniqueIndexes);
                isSearchVaultIdByToken(request);
            }
        }
        return true;
    }

    private void hasSearchVaultIdbyTokenInputRequest(TokenSearchRequest tokenSearchRequest) throws ValidationException {
        if (tokenSearchRequest.getIndex() == null) {
            throw new ValidationException(ErrorEntityCodes.INPUT_DATA_MISSING_FOR_VAULTID);
        }
        if (StringUtils.isEmpty(tokenSearchRequest.getToken()) || StringUtils.isEmpty(tokenSearchRequest.getReturnType())) {
            throw new ValidationException(ErrorEntityCodes.INPUT_DATA_MISSING_FOR_VAULTID, tokenSearchRequest.getIndex());
        }
    }

    private void isSearchVaultIdByToken(TokenSearchRequest tokenSearchRequest) throws ValidationException {
        if (!VaultConstants.DATA_TYPE_VAULT_ID.equalsIgnoreCase(tokenSearchRequest.getReturnType())) {
            throw new ValidationException(ErrorEntityCodes.INVALID_RETURN_TYPE, tokenSearchRequest.getIndex());
        }
        if (!StringUtils.isNumeric(tokenSearchRequest.getToken())) {
            throw new ValidationException(ErrorEntityCodes.INVALID_TOKEN_DATA, tokenSearchRequest.getIndex());
        }
        if (tokenSearchRequest.getToken().length() < TOKEN_DATA_MIN_LEN || tokenSearchRequest.getToken().length() > TOKEN_DATA_MAX_LEN) {
            throw new ValidationException(ErrorEntityCodes.INVALID_TOKEN_LENGTH, tokenSearchRequest.getIndex());
        }
    }
}
