package com.gap.customer.vaultservice.controller;

import com.gap.customer.vaultservice.error.ErrorCodes;
import com.gap.customer.vaultservice.error.ErrorEntity;
import com.gap.customer.vaultservice.error.ErrorEntityInternal;
import com.gap.customer.vaultservice.error.ErrorEntityMessage;
import com.gap.customer.vaultservice.exception.ValidationException;
import com.gap.customer.vaultservice.models.VaultRequest;
import com.gap.customer.vaultservice.util.VaultConstants;
import org.apache.commons.lang.StringUtils;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;

@Component
public class VaultServiceValidator {

    private static final Integer HTTP_STATUS_BAD_REQUEST = 400;

    public void validateVaultServiceRequest(List<VaultRequest> vaultRequests) throws ValidationException {

        HashMap<Integer, Integer> uniqueIndexes = new HashMap<>();
        if (vaultRequests == null || vaultRequests.isEmpty()) {
            throw new ValidationException(new ErrorEntityInternal(HTTP_STATUS_BAD_REQUEST,
                    new ErrorEntity(null, ErrorEntityMessage.INPUT_DATA_MISSING_USERMESSAGE,
                            Integer.valueOf(ErrorCodes.INPUT_DATA_MISSING), null)));
        }
        for (VaultRequest vaultRequest : vaultRequests) {
            if (vaultRequest.getIndex() == null) {
                throw new ValidationException(new ErrorEntityInternal(HTTP_STATUS_BAD_REQUEST,
                        new ErrorEntity(null, ErrorEntityMessage.INPUT_DATA_MISSING_USERMESSAGE,
                                Integer.valueOf(ErrorCodes.INPUT_DATA_MISSING), null)));
            }
            if (StringUtils.isEmpty(vaultRequest.getPlaintext()) || StringUtils.isEmpty(vaultRequest.getType())) {
                throw new ValidationException(new ErrorEntityInternal(HTTP_STATUS_BAD_REQUEST,
                        new ErrorEntity(null, ErrorEntityMessage.INPUT_DATA_MISSING_USERMESSAGE,
                                Integer.valueOf(ErrorCodes.INPUT_DATA_MISSING), null)), vaultRequest.getIndex());
            }

            validateRequestByType(vaultRequest);

            if (uniqueIndexes.containsKey(vaultRequest.getIndex())) {
                throw new ValidationException(new ErrorEntityInternal(HTTP_STATUS_BAD_REQUEST,
                        new ErrorEntity(null, ErrorEntityMessage.INDEXES_NOT_UNIQUE_USERMESSAGE,
                                Integer.valueOf(ErrorCodes.INDEXES_NOT_UNIQUE), null)), vaultRequest.getIndex());
            }
            uniqueIndexes.put(vaultRequest.getIndex(), vaultRequest.getIndex());
        }
    }

    public void validateVaultSecuredServiceRequest(List<VaultRequest> vaultRequests) throws ValidationException {

        HashMap<Integer, Integer> uniqueIndexes = new HashMap<Integer, Integer>();
        if (vaultRequests == null || vaultRequests.isEmpty()) {
            throw new ValidationException(new ErrorEntityInternal(HTTP_STATUS_BAD_REQUEST,
                    new ErrorEntity(null, ErrorEntityMessage.INPUT_DATA_MISSING_USERMESSAGE,
                            Integer.valueOf(ErrorCodes.INPUT_DATA_MISSING), null)));
        }
        for (VaultRequest vaultRequest : vaultRequests) {
            if (vaultRequest.getIndex() == null) {
                throw new ValidationException(new ErrorEntityInternal(HTTP_STATUS_BAD_REQUEST,
                        new ErrorEntity(null, ErrorEntityMessage.INPUT_DATA_MISSING_USERMESSAGE,
                                Integer.valueOf(ErrorCodes.INPUT_DATA_MISSING), null)));
            }
            if (StringUtils.isEmpty(vaultRequest.getPlaintext()) || StringUtils.isEmpty(vaultRequest.getType())) {
                throw new ValidationException(new ErrorEntityInternal(HTTP_STATUS_BAD_REQUEST,
                        new ErrorEntity(null, ErrorEntityMessage.INPUT_DATA_MISSING_USERMESSAGE,
                                Integer.valueOf(ErrorCodes.INPUT_DATA_MISSING), null)), vaultRequest.getIndex());
            }

            validateSecuredRequestByType(vaultRequest);

            if (uniqueIndexes.containsKey(vaultRequest.getIndex())) {
                throw new ValidationException(new ErrorEntityInternal(HTTP_STATUS_BAD_REQUEST,
                        new ErrorEntity(null, ErrorEntityMessage.INDEXES_NOT_UNIQUE_USERMESSAGE,
                                Integer.valueOf(ErrorCodes.INDEXES_NOT_UNIQUE), null)), vaultRequest.getIndex());
            }
            uniqueIndexes.put(vaultRequest.getIndex(), vaultRequest.getIndex());
        }
    }


    public void validateRequestByType(VaultRequest vaultRequest) throws ValidationException {
        if (VaultConstants.DATA_TYPE_CREDIT_CARD_NUMBER.equals(vaultRequest.getType())) {
            validateForCreditCardNumber(vaultRequest);
            return;
        }
        throw new ValidationException(new ErrorEntityInternal(HTTP_STATUS_BAD_REQUEST,
                new ErrorEntity(null, ErrorEntityMessage.INVALID_VALUE_TYPE_USERMESSAGE,
                        Integer.valueOf(ErrorCodes.INVALID_VALUE_TYPE), null)), vaultRequest.getIndex());
    }


    public void validateSecuredRequestByType(VaultRequest vaultRequest) throws ValidationException {
        switch (vaultRequest.getType()) {
            case VaultConstants.DATA_TYPE_CREDIT_CARD_NUMBER:
                validateForCreditCardNumber(vaultRequest);
                return;
            case VaultConstants.DATA_TYPE_GIFT_CARD_NUMBER:
                validateForGiftCardNumber(vaultRequest);
                return;
            case VaultConstants.DATA_TYPE_GIFT_CARD_PIN:
                validateForGiftCardPin(vaultRequest);
                return;
            case VaultConstants.DATA_TYPE_CREDIT_CARD_EXPIRY_YEAR:
                validateForCreditCardYear(vaultRequest);
                return;
            case VaultConstants.DATA_TYPE_CREDIT_CARD_EXPIRY_MONTH:
                validateForCreditCardMonth(vaultRequest);
                return;
            case VaultConstants.DATA_TYPE_GIFT_CARD_TRACK2:
                validateForGiftCardTrackTwo(vaultRequest);
                return;
            default:
                throw new ValidationException(new ErrorEntityInternal(HTTP_STATUS_BAD_REQUEST,
                        new ErrorEntity(null, ErrorEntityMessage.INVALID_VALUE_TYPE_USERMESSAGE,
                                Integer.valueOf(ErrorCodes.INVALID_VALUE_TYPE), null)), vaultRequest.getIndex());
        }
    }

    public void validateForGiftCardNumber(VaultRequest vaultRequest) throws ValidationException {
        if (VaultConstants.DATA_TYPE_GIFT_CARD_NUMBER.equalsIgnoreCase(vaultRequest.getType()) && !StringUtils.isNumeric(vaultRequest.getPlaintext())) {
            throw new ValidationException(new ErrorEntityInternal(HTTP_STATUS_BAD_REQUEST,
                    new ErrorEntity(null, ErrorEntityMessage.INVALID_GIFT_CARD_USERMESSAGE,
                            Integer.valueOf(ErrorCodes.INVALID_GIFT_CARD), null)), vaultRequest.getIndex());
        }
        if (vaultRequest.getPlaintext().length() > VaultConstants.GIFTCARD_MAX_LENGTH || vaultRequest.getPlaintext().length() < VaultConstants.GIFTCARD_MIN_LENGTH) {
            throw new ValidationException(new ErrorEntityInternal(HTTP_STATUS_BAD_REQUEST,
                    new ErrorEntity(null, ErrorEntityMessage.INVALID_GIFT_CARD_LENGTH_USERMESSAGE,
                            Integer.valueOf(ErrorCodes.INVALID_GIFT_CARD_LENGTH), null)), vaultRequest.getIndex());
        }
    }

    public void validateForGiftCardPin(VaultRequest vaultRequest) throws ValidationException {
        if (VaultConstants.DATA_TYPE_GIFT_CARD_PIN.equalsIgnoreCase(vaultRequest.getType()) && !StringUtils.isNumeric(vaultRequest.getPlaintext())) {
            throw new ValidationException(new ErrorEntityInternal(HTTP_STATUS_BAD_REQUEST,
                    new ErrorEntity(null, ErrorEntityMessage.INVALID_GIFT_CARD_PIN_USERMESSAGE,
                            Integer.valueOf(ErrorCodes.INVALID_GIFT_CARD_PIN), null)), vaultRequest.getIndex());
        }
    }

    public void validateForCreditCardNumber(VaultRequest vaultRequest) throws ValidationException {

        if (VaultConstants.DATA_TYPE_CREDIT_CARD_NUMBER.equalsIgnoreCase(vaultRequest.getType()) && !StringUtils.isNumeric(vaultRequest.getPlaintext())) {
            throw new ValidationException(new ErrorEntityInternal(HTTP_STATUS_BAD_REQUEST,
                    new ErrorEntity(null, ErrorEntityMessage.INVALID_CREDIT_CARD_USERMESSAGE,
                            Integer.valueOf(ErrorCodes.INVALID_CREDIT_CARD), null)), vaultRequest.getIndex());
        }
        if (vaultRequest.getPlaintext().length() > VaultConstants.CREDITCARD_MAX_LENGTH || vaultRequest.getPlaintext().length() < VaultConstants.CREDITCARD_MIN_LENGTH) {
            throw new ValidationException(new ErrorEntityInternal(HTTP_STATUS_BAD_REQUEST,
                    new ErrorEntity(null, ErrorEntityMessage.INVALID_CREDIT_CARD_LENGTH_USERMESSAGE,
                            Integer.valueOf(ErrorCodes.INVALID_CREDIT_CARD_LENGTH), null)), vaultRequest.getIndex());
        }

    }

    public void validateForCreditCardYear(VaultRequest vaultRequest) throws ValidationException {
        if (VaultConstants.DATA_TYPE_CREDIT_CARD_EXPIRY_YEAR.equalsIgnoreCase(vaultRequest.getType()) && !StringUtils.isNumeric(vaultRequest.getPlaintext())) {
            throw new ValidationException(new ErrorEntityInternal(HTTP_STATUS_BAD_REQUEST,
                    new ErrorEntity(null, ErrorEntityMessage.INVALID_CREDIT_CARD_USERMESSAGE,
                            Integer.valueOf(ErrorCodes.INVALID_CREDIT_CARD), null)), vaultRequest.getIndex());
        }

        if (vaultRequest.getPlaintext().length() > VaultConstants.CREDITCARD_EXPIRY_YEAR_MAX_LENGTH || vaultRequest.getPlaintext().length() < VaultConstants.CREDITCARD_EXPIRY_YEAR_MIN_LENGTH) {
            throw new ValidationException(new ErrorEntityInternal(HTTP_STATUS_BAD_REQUEST,
                    new ErrorEntity(null, ErrorEntityMessage.INVALID_CREDIT_CARD_LENGTH_USERMESSAGE,
                            Integer.valueOf(ErrorCodes.INVALID_CREDIT_CARD), null)), vaultRequest.getIndex());
        }

    }

    public void validateForCreditCardMonth(VaultRequest vaultRequest) throws ValidationException {
        if (VaultConstants.DATA_TYPE_CREDIT_CARD_EXPIRY_MONTH.equalsIgnoreCase(vaultRequest.getType()) && !StringUtils.isNumeric(vaultRequest.getPlaintext())) {
            throw new ValidationException(new ErrorEntityInternal(HTTP_STATUS_BAD_REQUEST,
                    new ErrorEntity(null, ErrorEntityMessage.INVALID_CREDIT_CARD_USERMESSAGE,
                            Integer.valueOf(ErrorCodes.INVALID_CREDIT_CARD), null)), vaultRequest.getIndex());
        }

        if (vaultRequest.getPlaintext().length() > VaultConstants.CREDITCARD_EXPIRY_MONTH_MAX_LENGTH || vaultRequest.getPlaintext().length() < VaultConstants.CREDITCARD_EXPIRY_MONTH_MIN_LENGTH) {
            throw new ValidationException(new ErrorEntityInternal(HTTP_STATUS_BAD_REQUEST,
                    new ErrorEntity(null, ErrorEntityMessage.INVALID_CREDIT_CARD_LENGTH_USERMESSAGE,
                            Integer.valueOf(ErrorCodes.INVALID_CREDIT_CARD), null)), vaultRequest.getIndex());
        }
    }

    public void validateForGiftCardTrackTwo(VaultRequest vaultRequest) throws ValidationException {
        if (vaultRequest.getPlaintext().length() > VaultConstants.GIFTCARDTRACK2_MAX_LENGTH || vaultRequest.getPlaintext().length() < VaultConstants.GIFTCARDTRACK2_MIN_LENGTH) {
            throw new ValidationException(new ErrorEntityInternal(HTTP_STATUS_BAD_REQUEST,
                    new ErrorEntity(null, ErrorEntityMessage.INVALID_GIFT_CARD_TRACK2_LENGTH_USERMESSAGE,
                            Integer.valueOf(ErrorCodes.INVALID_GIFT_CARD_TRACK2_LENGTH), null)), vaultRequest.getIndex());
        }
    }

}
