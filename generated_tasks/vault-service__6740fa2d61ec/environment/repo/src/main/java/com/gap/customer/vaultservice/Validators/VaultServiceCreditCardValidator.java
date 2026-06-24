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
public class VaultServiceCreditCardValidator {

    public boolean hasValidCreditCardNumber(VaultRequest vaultRequest, String xAppName) throws ValidationException {
        if (!VaultConstants.DATA_TYPE_CREDIT_CARD_NUMBER.equalsIgnoreCase(vaultRequest.getType())) {
            throw new ValidationException(ErrorEntityCodes.INVALID_VALUE_TYPE, vaultRequest.getIndex());
        }
        if (!StringUtils.isNumeric(vaultRequest.getPlaintext())) {
            throw new ValidationException(ErrorEntityCodes.INVALID_CREDIT_CARD, vaultRequest.getIndex());
        }
        if (vaultRequest.getPlaintext().length() > VaultConstants.CREDITCARD_LENGTH_NINETEEN || vaultRequest.getPlaintext().length() < VaultConstants.CREDITCARD_LENGTH_FOURTEEN) {
            log.info("Received request with CREDIT_CARD_LENGTH : " + vaultRequest.getPlaintext().length()+" from X-APP-NAME: "+xAppName);
        }
        if (vaultRequest.getPlaintext().length() > VaultConstants.CREDITCARD_MAX_LENGTH || vaultRequest.getPlaintext().length() < VaultConstants.CREDITCARD_MIN_LENGTH) {
            throw new ValidationException(ErrorEntityCodes.INVALID_CREDIT_CARD_LENGTH, vaultRequest.getIndex());
        }
        return true;
    }

    public boolean hasValidCreditCardYear(VaultRequest vaultRequest) throws ValidationException {
        if (!VaultConstants.DATA_TYPE_CREDIT_CARD_EXPIRY_YEAR.equalsIgnoreCase(vaultRequest.getType()) || !StringUtils.isNumeric(vaultRequest.getPlaintext())) {
            throw new ValidationException(ErrorEntityCodes.INVALID_CREDIT_CARD, vaultRequest.getIndex());
        }
        if (vaultRequest.getPlaintext().length() > VaultConstants.CREDITCARD_EXPIRY_YEAR_MAX_LENGTH || vaultRequest.getPlaintext().length() < VaultConstants.CREDITCARD_EXPIRY_YEAR_MIN_LENGTH) {
            throw new ValidationException(ErrorEntityCodes.INVALID_CREDIT_CARD_EXPIRY_YEAR_LENGTH, vaultRequest.getIndex());
        }
        return true;
    }

    public boolean hasValidCreditCardMonth(VaultRequest vaultRequest) throws ValidationException {
        if (!VaultConstants.DATA_TYPE_CREDIT_CARD_EXPIRY_MONTH.equalsIgnoreCase(vaultRequest.getType()) || !StringUtils.isNumeric(vaultRequest.getPlaintext())) {
            throw new ValidationException(ErrorEntityCodes.INVALID_CREDIT_CARD, vaultRequest.getIndex());
        }
        if (vaultRequest.getPlaintext().length() > VaultConstants.CREDITCARD_EXPIRY_MONTH_MAX_LENGTH || vaultRequest.getPlaintext().length() < VaultConstants.CREDITCARD_EXPIRY_MONTH_MIN_LENGTH) {
            throw new ValidationException(ErrorEntityCodes.INVALID_CREDIT_CARD_EXPIRY_MONTH_LENGTH, vaultRequest.getIndex());
        }
        if (Integer.parseInt(vaultRequest.getPlaintext()) > 12 || Integer.parseInt(vaultRequest.getPlaintext()) <= 0) {
            throw new ValidationException(ErrorEntityCodes.INVALID_CREDIT_CARD_EXPIRY_MONTH, vaultRequest.getIndex());
        }
        return true;
    }
}
