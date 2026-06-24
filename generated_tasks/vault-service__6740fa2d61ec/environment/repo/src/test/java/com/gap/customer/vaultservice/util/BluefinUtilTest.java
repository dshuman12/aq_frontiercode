package com.gap.customer.vaultservice.util;

import com.gap.gid.security.model.DataType;
import org.junit.jupiter.api.Test;

import static com.gap.customer.vaultservice.util.BluefinUtil.getBluefinDatatype;
import static org.junit.jupiter.api.Assertions.assertEquals;

public class BluefinUtilTest {
    @Test
    public void shouldReturnCreditCardDatatype() {
        assertEquals(DataType.CreditCardNumber, getBluefinDatatype("CreditCardNumber"));
    }

    @Test
    public void shouldReturnCreditCardExpiryMonthDatatype() {
        assertEquals(DataType.CreditCardExpiryMonth, getBluefinDatatype("CreditCardExpiryMonth"));
    }

    @Test
    public void shouldReturnCreditCardYearDatatype() {
        assertEquals(DataType.CreditCardExpiryYear, getBluefinDatatype("CreditCardExpiryYear"));
    }

    @Test
    public void shouldReturnGiftCardNumberDatatype() {
        assertEquals(DataType.GiftCardNumber, getBluefinDatatype("GiftCardNumber"));
    }

    @Test
    public void shouldReturnGiftCardPinDatatype() {
        assertEquals(DataType.GiftCardPin, getBluefinDatatype("GiftCardPin"));
    }

    @Test
    public void shouldReturnGiftCardTrack2Datatype() {
        assertEquals(DataType.GiftCardTrack2, getBluefinDatatype("GiftCardTrack2"));
    }
}