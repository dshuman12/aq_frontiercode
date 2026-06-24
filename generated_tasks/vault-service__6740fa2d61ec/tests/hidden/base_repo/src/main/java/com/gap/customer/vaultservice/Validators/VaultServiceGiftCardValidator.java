package com.gap.customer.vaultservice.Validators;

import com.gap.customer.vaultservice.error.ErrorEntityCodes;
import com.gap.customer.vaultservice.exception.ValidationException;
import com.gap.customer.vaultservice.models.VaultRequest;
import com.gap.customer.vaultservice.util.VaultConstants;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang.StringUtils;
import org.springframework.stereotype.Component;


@Slf4j
@Component
public class VaultServiceGiftCardValidator {

    public boolean hasValidGiftCardNumber(VaultRequest vaultRequest) throws ValidationException {
        if (!VaultConstants.DATA_TYPE_GIFT_CARD_NUMBER.equalsIgnoreCase(vaultRequest.getType()) || !StringUtils.isNumeric(vaultRequest.getPlaintext())) {
            throw new ValidationException(ErrorEntityCodes.INVALID_GIFT_CARD, vaultRequest.getIndex());
        }
        if (vaultRequest.getPlaintext().length() > VaultConstants.GIFTCARD_MAX_LENGTH || vaultRequest.getPlaintext().length() < VaultConstants.GIFTCARD_MIN_LENGTH) {
            throw new ValidationException(ErrorEntityCodes.INVALID_GIFT_CARD_LENGTH, vaultRequest.getIndex());
        }
        return true;
    }

    public boolean hasValidGiftCardPin(VaultRequest vaultRequest) throws ValidationException {
        if (!VaultConstants.DATA_TYPE_GIFT_CARD_PIN.equalsIgnoreCase(vaultRequest.getType()) || !StringUtils.isNumeric(vaultRequest.getPlaintext())) {
            throw new ValidationException(ErrorEntityCodes.INVALID_GIFT_CARD_PIN, vaultRequest.getIndex());
        }
        if (vaultRequest.getPlaintext().length() > VaultConstants.GIFTCARD_PIN_MAX_LENGTH || vaultRequest.getPlaintext().length() < VaultConstants.GIFTCARD_PIN_MIN_LEN) {
            throw new ValidationException(ErrorEntityCodes.INVALID_GIFT_CARD_PIN_LENGTH, vaultRequest.getIndex());
        }
        return true;
    }

    public boolean hasValidGiftCardTrackTwo(VaultRequest vaultRequest) throws ValidationException {
        if (vaultRequest.getPlaintext().length() > VaultConstants.GIFTCARDTRACK2_MAX_LENGTH || vaultRequest.getPlaintext().length() < VaultConstants.GIFTCARDTRACK2_MIN_LENGTH) {
            throw new ValidationException(ErrorEntityCodes.INVALID_GIFT_CARD_TRACK2_LENGTH, vaultRequest.getIndex());
        }
        return true;
    }
}
