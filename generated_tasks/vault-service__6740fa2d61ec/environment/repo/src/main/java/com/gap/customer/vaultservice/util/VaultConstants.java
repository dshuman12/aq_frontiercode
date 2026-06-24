package com.gap.customer.vaultservice.util;

import com.google.common.collect.ImmutableList;

import java.util.ArrayList;

public class VaultConstants {

    public static final String DATA_TYPE_CREDIT_CARD_NUMBER = "CREDIT_CARD_NUMBER";
    public static final String DATA_TYPE_CREDIT_CARD_EXPIRY_MONTH = "CREDIT_CARD_EXPIRY_MONTH";
    public static final String DATA_TYPE_CREDIT_CARD_EXPIRY_YEAR = "CREDIT_CARD_EXPIRY_YEAR";
    public static final String DATA_TYPE_GIFT_CARD_NUMBER = "GIFT_CARD_NUMBER";
    public static final String DATA_TYPE_GIFT_CARD_PIN = "GIFT_CARD_PIN";
    public static final String DATA_TYPE_VAULT_ID = "VAULT_ID";
    public static final String DATA_TYPE_GIFT_CARD_TRACK2 = "GIFT_CARD_TRACK2";
    public static final String DATA_TYPE_PASSWORD = "PASSWORD";
    public static final String DATA_TYPE_TOKEN = "TOKEN";
    public static final String REQ_TYPE_CREDIT_CARD_NUMBER = "CreditCardNumber";
    public static final String REQ_TYPE_CREDIT_CARD_EXPIRY_MONTH = "CreditCardExpiryMonth";
    public static final String REQ_TYPE_CREDIT_CARD_EXPIRY_YEAR = "CreditCardExpiryYear";
    public static final String REQ_TYPE_GIFT_CARD_NUMBER = "GiftCardNumber";
    public static final String REQ_TYPE_GIFT_CARD_PIN = "GiftCardPin";
    public static final String REQ_TYPE_VAULT_ID = "VaultId";
    public static final String REQ_TYPE_GIFT_CARD_TRACK2 = "GiftCardTrack2";
    public static final String REQ_TYPE_PASSWORD = "Password";
    public static final String REQ_TYPE_TOKEN = "Token";
    public static final String STORED_VALUE_CARD_NUMBER = "StoredValueCardNumber";
    public static final String STORED_VALUE_CARD_PIN = "StoredValueCardPin";
    public static final String DATA_TYPE_TOKEN_SEARCH = "Token";
    public static final String DATA_TYPE_VAULT_ID_SEARCH = "VaultId";
    public static final String DATA_SCOPE_CREDIT_CARD = "creditCard";
    public static final String DATA_SCOPE_GIFT_CARD = "giftCard";
    public static final String DATA_SCOPE_TOKEN = "token";
    public static final String DATA_SCOPE_HEADER = "x-apigee-scopes";
    public static final String X_APP_NAME_HEADER = "X-App-Name";
    public static final String UNAUTHENTICATED = "UNAUTHENTICATED";
    public static final Integer CREDITCARD_MIN_LENGTH = 13;
    public static final Integer CREDITCARD_MAX_LENGTH = 20;
    public static final Integer CREDITCARD_LENGTH_FOURTEEN = 14;
    public static final Integer CREDITCARD_LENGTH_NINETEEN = 19;
    public static final Integer CREDITCARD_EXPIRY_YEAR_MAX_LENGTH = 4;
    public static final Integer CREDITCARD_EXPIRY_YEAR_MIN_LENGTH = 2;
    public static final Integer CREDITCARD_EXPIRY_MONTH_MAX_LENGTH = 2;
    public static final Integer CREDITCARD_EXPIRY_MONTH_MIN_LENGTH = 2;
    public static final Integer GIFTCARD_MIN_LENGTH = 16;
    public static final Integer GIFTCARD_MAX_LENGTH = 20;
    public static final Integer GIFTCARDTRACK2_MIN_LENGTH = 16;
    public static final Integer GIFTCARDTRACK2_MAX_LENGTH = 64;
    public static final Integer HTTP_STATUS_BAD_REQUEST = 400;
    public static final Integer INPUT_DATA_MAX_LEN = 32;
    public static final Integer TOKEN_DATA_MIN_LEN = 13;
    public static final Integer TOKEN_DATA_MAX_LEN = 20;
    public static final Integer GIFTCARD_PIN_MAX_LENGTH = 20;
    public static final Integer GIFTCARD_PIN_MIN_LEN = 4;
    public static final Integer HTTP_STATUS_NOT_FOUND = 404;
    public static final String BLUEFIN_FLAG = "BLUEFIN";
    public static final String LEGACY_FLAG = "LEGACY";
    public static final String AZURE_DB_TIMEOUT = "AZUREDBTIMEOUT";
    public static final Integer SQL_TIMEOUT_TIMER = 250 ;
    public static final String TOKENIZE_TIMEOUT = "TOKENIZETIMEOUT";
    public static final String BULK_TOKENIZE_TIMEOUT = "BULKTOKENIZETIMEOUT";
    public static final String DETOKENIZE_TIMEOUT = "DETOKENIZETIMEOUT";
    public static final String BULK_DETOKENIZE_TIMEOUT = "BULKDETOKTIMEOUT";
    public static final String BF_CONNECT_TIMEOUT = "BFCONNECTTIMEOUT";
    public static final String BF_CONPOOL_REQTIMEOUT = "BFCONPOOLREQTIMEOUT";
    public static final String BLUEFIN_FOR_01T_FLAG = "BLUEFINFOR01T";
    public static final String BLUEFIN_EXCEPTION_ERROR = "Call to Bluefin timed-out";
    public static final ImmutableList<String> lookUpFlags = ImmutableList.of(BLUEFIN_FLAG, LEGACY_FLAG, AZURE_DB_TIMEOUT
    ,TOKENIZE_TIMEOUT, BULK_TOKENIZE_TIMEOUT, DETOKENIZE_TIMEOUT, BULK_DETOKENIZE_TIMEOUT,BF_CONNECT_TIMEOUT,BF_CONPOOL_REQTIMEOUT, BLUEFIN_FOR_01T_FLAG);

}
