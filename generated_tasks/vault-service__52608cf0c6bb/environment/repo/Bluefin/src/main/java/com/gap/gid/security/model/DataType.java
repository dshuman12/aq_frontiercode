package com.gap.gid.security.model;

import lombok.Getter;

@Getter
public enum DataType {
    CreditCardNumber("scx_token_card_number", "templateRefCreditCard"),
    GiftCardNumber("gift_card_number", "templateRefGiftCard"),
    GiftCardPin("gift_card_pin", "templateRefGiftCard"),
    GiftCardTrack2("gift_card_track2", "templateRefGiftCard"),
    CreditCardExpiryMonth("credit_card_expiry_month", "templateRefGiftCard"),
    CreditCardExpiryYear("credit_card_expiry_year", "templateRefGiftCard");

    private final String value;
    private final String templateRefName;

    DataType(String value, String templateRefName) {
        this.value = value;
        this.templateRefName = templateRefName;
    }
}
