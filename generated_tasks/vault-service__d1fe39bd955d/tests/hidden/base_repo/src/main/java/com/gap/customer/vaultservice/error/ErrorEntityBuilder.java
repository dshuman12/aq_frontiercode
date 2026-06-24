package com.gap.customer.vaultservice.error;

import java.util.HashMap;
import javax.annotation.PostConstruct;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;

import static com.gap.customer.vaultservice.error.ErrorEntityMessage.*;

@Component
@Scope("singleton")
public class ErrorEntityBuilder {

    private HashMap<String, ErrorEntity> codeToErrorMap;

    private ErrorEntityBuilder() {
    }

    @PostConstruct
    public void getErrorCodes() {
        codeToErrorMap = new HashMap<>();
        getErrorCodesForCreditCardData();
        getErrorCodesForGiftCardData();
        getErrorCodesForVaultId();
        getErrorCodesForMissingData();
    }

    public ErrorEntity build(String code) {
        return codeToErrorMap.get(code);
    }

    public ErrorEntity build(String code, String developerMessage) {
        ErrorEntity errorEntity = codeToErrorMap.get(code);
        errorEntity.setDeveloperMessage(developerMessage);
        return errorEntity;
    }

    public ErrorEntity buildWithMoreInfo(String code, String moreInfo) {
        ErrorEntity errorEntity = codeToErrorMap.get(code);
        errorEntity.setMoreInfo(moreInfo);
        return errorEntity;
    }

    private void getErrorCodesForVaultId() {
        codeToErrorMap.put(ErrorEntityCodes.INVALID_VAULT_ID_LENGTH, new ErrorEntity()
                .setUserMessage(INVALID_VAULT_ID_LENGTH_USERMESSAGE)
                .setErrorCode(Integer.valueOf(ErrorCodes.INVALID_VAULT_ID_LENGTH)));
        codeToErrorMap.put(ErrorEntityCodes.INVALID_VAULT_ID, new ErrorEntity()
                .setUserMessage(INVALID_VAULT_ID_USERMESSAGE)
                .setErrorCode(Integer.valueOf(ErrorCodes.INVALID_VAULT_ID)));
        codeToErrorMap.put(ErrorEntityCodes.INVALID_VAULT_ID_LENGTH_WITH_MORE_INFO, new ErrorEntity()
                .setUserMessage(INVALID_VAULT_ID_LENGTH_USERMESSAGE)
                .setErrorCode(Integer.valueOf(ErrorCodes.INVALID_VAULT_ID_LENGTH))
                .setMoreInfo("Please enter valid vault-id data"));
    }

    private void getErrorCodesForGiftCardData() {
        codeToErrorMap.put(ErrorEntityCodes.INVALID_GIFT_CARD_PIN, new ErrorEntity()
                .setUserMessage(INVALID_GIFT_CARD_PIN_USERMESSAGE)
                .setErrorCode(Integer.valueOf(ErrorCodes.INVALID_GIFT_CARD_PIN)));
        codeToErrorMap.put(ErrorEntityCodes.INVALID_GIFT_CARD_TRACK2_LENGTH, new ErrorEntity()
                .setUserMessage(INVALID_GIFT_CARD_TRACK2_LENGTH_USERMESSAGE)
                .setErrorCode(Integer.valueOf(ErrorCodes.INVALID_GIFT_CARD_TRACK2_LENGTH)));
        codeToErrorMap.put(ErrorEntityCodes.INVALID_GIFT_CARD_PIN_LENGTH, new ErrorEntity()
                .setUserMessage(INVALID_GIFT_CARD_PIN_LEN_MESSAGE)
                .setErrorCode(Integer.valueOf(ErrorCodes.INVALID_GIFT_CARD_PIN)));
        codeToErrorMap.put(ErrorEntityCodes.INVALID_GIFT_CARD_LENGTH, new ErrorEntity()
                .setUserMessage(INVALID_GIFT_CARD_LENGTH_USERMESSAGE)
                .setErrorCode(Integer.valueOf(ErrorCodes.INVALID_GIFT_CARD_LENGTH)));
        codeToErrorMap.put(ErrorEntityCodes.INVALID_GIFT_CARD, new ErrorEntity()
                .setUserMessage(INVALID_GIFT_CARD_USERMESSAGE)
                .setErrorCode(Integer.valueOf(ErrorCodes.INVALID_GIFT_CARD)));
    }

    private void getErrorCodesForCreditCardData() {
        codeToErrorMap.put(ErrorEntityCodes.INVALID_CREDIT_CARD_LENGTH, new ErrorEntity()
                .setUserMessage(INVALID_CREDIT_CARD_LENGTH_USERMESSAGE)
                .setErrorCode(Integer.valueOf(ErrorCodes.INVALID_CREDIT_CARD_LENGTH))
                .setMoreInfo("Please enter valid credit card number"));
        codeToErrorMap.put(ErrorEntityCodes.INVALID_CREDIT_CARD, new ErrorEntity()
                .setUserMessage(INVALID_CREDIT_CARD_USERMESSAGE)
                .setErrorCode(Integer.valueOf(ErrorCodes.INVALID_CREDIT_CARD)));
        codeToErrorMap.put(ErrorEntityCodes.INVALID_CREDIT_CARD_EXPIRY_YEAR_LENGTH, new ErrorEntity()
                .setUserMessage(INVALID_CREDIT_CARD_EXPIRY_YEAR_LENGTH_USERMESSAGE)
                .setErrorCode(Integer.valueOf(ErrorCodes.INVALID_CREDIT_CARD)));
        codeToErrorMap.put(ErrorEntityCodes.INVALID_CREDIT_CARD_EXPIRY_MONTH_LENGTH, new ErrorEntity()
                .setUserMessage(INVALID_CREDIT_CARD_EXPIRY_MONTH_LENGTH_USERMESSAGE)
                .setErrorCode(Integer.valueOf(ErrorCodes.INVALID_CREDIT_CARD)));
        codeToErrorMap.put(ErrorEntityCodes.INVALID_CREDIT_CARD_EXPIRY_MONTH, new ErrorEntity()
                .setUserMessage(INVALID_CREDIT_CARD_EXPIRY_MONTH)
                .setErrorCode(Integer.valueOf(ErrorCodes.INVALID_CREDIT_CARD)));
        codeToErrorMap.put(ErrorEntityCodes.INVALID_TOKEN_DATA, new ErrorEntity()
                .setUserMessage(INVALID_TOKEN_DATA_MESSAGE)
                .setErrorCode(Integer.valueOf(ErrorCodes.INVALID_TOKEN)));
        codeToErrorMap.put(ErrorEntityCodes.INVALID_TOKEN_LENGTH, new ErrorEntity()
                .setUserMessage(INVALID_TOKEN_LEN_MESSAGE)
                .setErrorCode(Integer.valueOf(ErrorCodes.INVALID_TOKEN_LENGTH)));
        codeToErrorMap.put(ErrorEntityCodes.BLUEFIN_TOKENIZE_EXECPTION, new ErrorEntity()
                .setUserMessage(BLUEFIN_TOKENIZATION_ERROR_USERMESSAGE)
                .setErrorCode(Integer.valueOf(ErrorEntityCodes.BLUEFIN_TOKENIZE_EXECPTION))
                .setMoreInfo("Please check the input data"));
        codeToErrorMap.put(ErrorEntityCodes.BLUEFIN_DETOKENIZE_EXECPTION, new ErrorEntity()
                .setUserMessage(BLUEFIN_DETOKENIZATION_ERROR_USERMESSAGE)
                .setErrorCode(Integer.valueOf(ErrorEntityCodes.BLUEFIN_DETOKENIZE_EXECPTION))
                .setMoreInfo("Please check the input data"));
        codeToErrorMap.put(ErrorEntityCodes.BLUEFIN_NOT_SUPPORTED, new ErrorEntity()
                .setUserMessage(BLUEFIN_NOT_SUPPORTED_ERROR_USERMESSAGE)
                .setErrorCode(Integer.valueOf(ErrorEntityCodes.BLUEFIN_NOT_SUPPORTED))
                .setMoreInfo("Please check the input data"));
        codeToErrorMap.put(ErrorEntityCodes.BLUEFIN_TIMEOUT_EXECPTION, new ErrorEntity()
                .setUserMessage(BLUEFIN_TIMEOUT_ERROR_USERMESSAGE)
                .setErrorCode(Integer.valueOf(ErrorEntityCodes.BLUEFIN_TIMEOUT_EXECPTION))
                .setMoreInfo("Call to bluefin timed-out."));
    }

    private void getErrorCodesForMissingData() {
        codeToErrorMap.put(ErrorEntityCodes.INDEXES_NOT_UNIQUE, new ErrorEntity()
                .setUserMessage(INDEXES_NOT_UNIQUE_USERMESSAGE)
                .setErrorCode(Integer.valueOf(ErrorCodes.INDEXES_NOT_UNIQUE)));
        codeToErrorMap.put(ErrorEntityCodes.INVALID_VALUE_TYPE, new ErrorEntity()
                .setUserMessage(INVALID_VALUE_TYPE_USERMESSAGE)
                .setErrorCode(Integer.valueOf(ErrorCodes.INVALID_VALUE_TYPE)));
        codeToErrorMap.put(ErrorEntityCodes.INPUT_DATA_MISSING, new ErrorEntity()
                .setUserMessage(INPUT_DATA_MISSING_USERMESSAGE)
                .setErrorCode(Integer.valueOf(ErrorCodes.INPUT_DATA_MISSING)));
        codeToErrorMap.put(ErrorEntityCodes.INVALID_VALUE_TYPE_FOR_MATCH, new ErrorEntity()
                .setUserMessage(INVALID_VALUE_TYPE_USERMESSAGE)
                .setErrorCode(Integer.valueOf(ErrorCodes.INPUT_DATA_MISSING))
                .setMoreInfo("Please check type"));
        codeToErrorMap.put(ErrorEntityCodes.INVALID_RETURN_TYPE, new ErrorEntity()
                .setUserMessage(INVALID_RETURN_TYPE_MESSAGE)
                .setErrorCode(Integer.valueOf(ErrorCodes.INVALID_RETURN_TYPE)));
        codeToErrorMap.put(ErrorEntityCodes.INVALID_RETURN_TYPE_FOR_SCOPES, new ErrorEntity()
                .setUserMessage(INVALID_RETURN_TYPE_MESSAGE)
                .setErrorCode(Integer.valueOf(ErrorCodes.INPUT_DATA_MISSING))
                .setMoreInfo("Please check return types"));
        codeToErrorMap.put(ErrorEntityCodes.INPUT_DATA_MISSING_FOR_VAULTID, new ErrorEntity()
                .setUserMessage(INPUT_DATA_MISSING_FOR_VAULTID_USERMESSAGE)
                .setErrorCode(Integer.valueOf(ErrorCodes.INPUT_DATA_MISSING)));
        codeToErrorMap.put(ErrorEntityCodes.INPUT_DATA_MISSING_FOR_MATCH, new ErrorEntity()
                .setUserMessage(INPUT_DATA_MISSING_FOR_MATCH_USERMESSAGE)
                .setErrorCode(Integer.valueOf(ErrorCodes.INPUT_DATA_MISSING)));
        codeToErrorMap.put(ErrorEntityCodes.INVALID_VAULT_SEARCH, new ErrorEntity()
                .setUserMessage(INVALID_VAULT_SEARCH_INPUT_MESSAGE)
                .setErrorCode(Integer.valueOf(ErrorCodes.INPUT_DATA_MISSING)));
        codeToErrorMap.put(ErrorEntityCodes.INVALID_REQUEST, new ErrorEntity()
                .setUserMessage(INVALID_REQUEST)
                .setErrorCode(Integer.valueOf(ErrorCodes.INPUT_DATA_MISSING)));
        codeToErrorMap.put(ErrorEntityCodes.DATA_NOT_FOUND, new ErrorEntity()
                .setUserMessage(DATA_NOT_FOUND_USERMESSAGE)
                .setErrorCode(Integer.valueOf(ErrorCodes.DATA_NOT_FOUND)));
        codeToErrorMap.put(ErrorEntityCodes.INTERNAL_SERVER_ERROR, new ErrorEntity()
                .setUserMessage(INTERNAL_SERVER_ERROR_USERMESSAGE)
                .setErrorCode(Integer.valueOf(ErrorCodes.INTERNAL_SERVER_ERROR)));
        codeToErrorMap.put(ErrorEntityCodes.INVALID_LOOKUP_DATA, new ErrorEntity()
                .setUserMessage(INVALID_LOOKUP_DATA_USERMESSAGE)
                .setErrorCode(Integer.valueOf(ErrorCodes.INPUT_DATA_MISSING)));
    }
}
