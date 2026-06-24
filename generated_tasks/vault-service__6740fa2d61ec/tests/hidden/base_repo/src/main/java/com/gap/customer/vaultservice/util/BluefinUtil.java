package com.gap.customer.vaultservice.util;


import com.gap.gid.security.model.DataType;

public class BluefinUtil {
    public static DataType getBluefinDatatype(String vaultDataType) {
        switch (vaultDataType) {
            case VaultConstants.REQ_TYPE_GIFT_CARD_NUMBER:
                return DataType.GiftCardNumber;
            case VaultConstants.REQ_TYPE_GIFT_CARD_PIN:
                return DataType.GiftCardPin;
            case VaultConstants.REQ_TYPE_GIFT_CARD_TRACK2:
                return DataType.GiftCardTrack2;
            case VaultConstants.REQ_TYPE_CREDIT_CARD_EXPIRY_YEAR:
                return DataType.CreditCardExpiryYear;
            case VaultConstants.REQ_TYPE_CREDIT_CARD_EXPIRY_MONTH:
                return DataType.CreditCardExpiryMonth;
            default:
                return DataType.CreditCardNumber;
        }
    }
}
