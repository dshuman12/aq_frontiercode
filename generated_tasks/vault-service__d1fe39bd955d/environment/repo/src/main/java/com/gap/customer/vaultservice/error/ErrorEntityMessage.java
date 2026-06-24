package com.gap.customer.vaultservice.error;

public class ErrorEntityMessage {

	public static final String INDEXES_NOT_UNIQUE_USERMESSAGE = "Indexes are not unique.";
	public static final String INVALID_VALUE_TYPE_USERMESSAGE = "Some types are invalid.";
	public static final String INPUT_DATA_MISSING_USERMESSAGE = "Index, type or plaintext is missing.";
	public static final String INPUT_DATA_MISSING_FOR_VAULTID_USERMESSAGE = "Index, ReturnType or Token is missing.";
	public static final String INPUT_DATA_MISSING_FOR_MATCH_USERMESSAGE = "VaultId, type or plaintext is missing.";
	public static final String INVALID_RETURN_TYPE_MESSAGE = "Some return types are invalid";
	public static final String INVALID_TOKEN_DATA_MESSAGE = "Some tokens are invalid. Only digits are allowed";
	public static final String INVALID_TOKEN_LEN_MESSAGE = "Invalid token length - Maxium allowed length is 20 and Minimum allowed length is 13.";
	public static final String INVALID_VAULT_SEARCH_INPUT_MESSAGE = "ReturnType,Index or VaultId is missing.";
	public static final String INVALID_GIFT_CARD_PIN_LEN_MESSAGE = "Invalid Gift Card Pin Length";

	public static final String INTERNAL_SERVER_ERROR_USERMESSAGE = "Internal server error.";
	public static final String DATA_NOT_FOUND_USERMESSAGE = "Some data was not found.";

	public static final String INVALID_CREDIT_CARD_LENGTH_USERMESSAGE = "Invalid credit card length - maximum allowed length is 20 and minimum allowed length is 13.";

	public static final String INVALID_CREDIT_CARD_EXPIRY_YEAR_LENGTH_USERMESSAGE = "Invalid credit card expiry year length - maximum allowed length is 4 and minimum allowed length is 2.";

	public static final String INVALID_CREDIT_CARD_EXPIRY_MONTH_LENGTH_USERMESSAGE = "Invalid credit card expiry month - maximum allowed length is 2 and minimum allowed length is 2.";

	public static final String INVALID_VAULT_ID_LENGTH_USERMESSAGE = "Invalid vault-id length - maximum allowed length is 32.";
	public static final String INVALID_GIFT_CARD_LENGTH_USERMESSAGE ="Invalid gift card length - Maximum allowed length is 20 and Minimum allowed length is 16";

	public static final String INVALID_CREDIT_CARD_USERMESSAGE = "Some credit card numbers are invalid.";
	public static final String INVALID_VAULT_ID_USERMESSAGE = "Some vault-ids are invalid.";
	public static final String INVALID_GIFT_CARD_USERMESSAGE = "Some gift card numbers are invalid.Only digits are allowed.";
	public static final String INVALID_GIFT_CARD_PIN_USERMESSAGE = "Some gift card pin numbers are invalid.Only digits are allowed.";

	public static final String INVALID_GIFT_CARD_TRACK2_LENGTH_USERMESSAGE = "Invalid gift card track2 length - Maximum allowed length is 64 and Minimum allowed length is 16.";
	public static final String INVALID_REQUEST = "Invalid  request";
	public static final String INVALID_VAULT_ID_MESSAGE = "NOT_FOUND";
	public static final String INVALID_CREDIT_CARD_EXPIRY_MONTH = "Invalid credit card expiry month";
	public static final String BLUEFIN_TOKENIZATION_ERROR_USERMESSAGE = "Unable to tokenize the given data.";
	public static final String BLUEFIN_DETOKENIZATION_ERROR_USERMESSAGE = "Unable to detokenize the given data.";
	public static final String BLUEFIN_NOT_SUPPORTED_ERROR_USERMESSAGE = "Bluefin integration is not supported.";
	public static final String INVALID_LOOKUP_DATA_USERMESSAGE = "Invalid lookup data.";
	public static final String BLUEFIN_TIMEOUT_ERROR_USERMESSAGE = "Request failed for the given data due to timeout";
	public static final String UNHANDLED_EXCEPTION_MESSAGE = "An unhandled error occured when trying to create or retrieve the data for given request";
}
