package com.gap.customer.vaultservice.Validators;

import com.gap.customer.vaultservice.error.ErrorEntityCodes;
import com.gap.customer.vaultservice.exception.ValidationException;
import com.gap.customer.vaultservice.models.VaultRequest;
import com.gap.customer.vaultservice.util.VaultConstants;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class VaultEntryServiceValidatorUtil {

    private final VaultServiceCreditCardValidator vaultServiceCreditCardValidator;
    private final VaultServiceGiftCardValidator vaultServiceGiftCardValidator;

    public boolean hasValidatePostRequests(VaultRequest vaultRequest, String xAppName) throws ValidationException {
        switch (vaultRequest.getType()) {
            case VaultConstants.DATA_TYPE_CREDIT_CARD_NUMBER:
                return vaultServiceCreditCardValidator.hasValidCreditCardNumber(vaultRequest, xAppName);

            case VaultConstants.DATA_TYPE_GIFT_CARD_NUMBER:
                return vaultServiceGiftCardValidator.hasValidGiftCardNumber(vaultRequest);

            case VaultConstants.DATA_TYPE_GIFT_CARD_PIN:
                return vaultServiceGiftCardValidator.hasValidGiftCardPin(vaultRequest);

            case VaultConstants.DATA_TYPE_CREDIT_CARD_EXPIRY_YEAR:
                return vaultServiceCreditCardValidator.hasValidCreditCardYear(vaultRequest);

            case VaultConstants.DATA_TYPE_CREDIT_CARD_EXPIRY_MONTH:
                return vaultServiceCreditCardValidator.hasValidCreditCardMonth(vaultRequest);

            case VaultConstants.DATA_TYPE_GIFT_CARD_TRACK2:
                return vaultServiceGiftCardValidator.hasValidGiftCardTrackTwo(vaultRequest);
            case VaultConstants.DATA_TYPE_PASSWORD:
                return true;

            default:
                throw new ValidationException(ErrorEntityCodes.INVALID_VALUE_TYPE, vaultRequest.getIndex());
        }
    }

    public boolean hasValidatePostRequestsForTokenEntries(VaultRequest vaultRequest, String xAppName) throws ValidationException {
        if (VaultConstants.DATA_TYPE_CREDIT_CARD_NUMBER.equals(vaultRequest.getType())) {
            return vaultServiceCreditCardValidator.hasValidCreditCardNumber(vaultRequest, xAppName);
        }
        throw new ValidationException(ErrorEntityCodes.INVALID_VALUE_TYPE, vaultRequest.getIndex());
    }
}
