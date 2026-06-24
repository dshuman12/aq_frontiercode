package com.gap.customer.vaultservice.controller;

import com.gap.customer.vaultservice.exception.VaultServiceException;
import java.util.ArrayList;
import java.util.List;

import com.gap.customer.vaultservice.models.*;
import com.gap.customer.vaultservice.util.VaultConstants;
import org.apache.commons.collections4.CollectionUtils;
import org.springframework.stereotype.Component;

@Component
public class VaultServiceConvertor {

    private static final String TYPE_VAULTID = "VaultId";
    private static final String TYPE_TOKEN = "TOKEN";
    private static final String CREDIT_CARD_NUMBER = "CreditCardNumber";
    private static final String GIFT_CARD_NUMBER = "GiftCardNumber";
    private static final String GIFT_CARD_PIN = "GiftCardPin";
    private static final String CREDIT_CARD_YEAR = "CreditCardExpiryYear";
    private static final String CREDIT_CARD_MONTH = "CreditCardExpiryMonth";
    private static final String GIFT_CARD_TRACK2 = "GiftCardTrack2";
    private static final String PASSWORD = "Password";
    private static final Integer HTTP_STATUS_NOT_FOUND = 404;


    /*
    public VaultClientRequest buildVaultClientRequest(List<VaultRequest> vaultRequests) throws VaultServiceException {
        VaultClientRequest clientRequest = new VaultClientRequest();
        if (vaultRequests.size() > 0 && !StringUtils.isEmpty(vaultRequests.get(0).getType())) {
            if (VaultConstants.DATA_TYPE_CREDIT_CARD_NUMBER.equals(vaultRequests.get(0).getType())) {
                clientRequest.setRequestFormat(CREDIT_CARD_NUMBER);
            }
            if (VaultConstants.DATA_TYPE_GIFT_CARD_NUMBER.equals(vaultRequests.get(0).getType())) {
                clientRequest.setRequestFormat(GIFT_CARD_NUMBER);
            }
            if (VaultConstants.DATA_TYPE_GIFT_CARD_PIN.equals(vaultRequests.get(0).getType())) {
                clientRequest.setRequestFormat(GIFT_CARD_PIN);
            }
            if(VaultConstants.DATA_TYPE_CREDIT_CARD_EXPIRY_YEAR.equals(vaultRequests.get(0).getType())){
                clientRequest.setRequestFormat(CREDIT_CARD_YEAR);
            }
            if(VaultConstants.DATA_TYPE_CREDIT_CARD_EXPIRY_MONTH.equals(vaultRequests.get(0).getType())) {
                clientRequest.setRequestFormat(CREDIT_CARD_MONTH);
            }
            if (VaultConstants.DATA_TYPE_GIFT_CARD_TRACK2.equals(vaultRequests.get(0).getType())) {
                clientRequest.setRequestFormat(GIFT_CARD_TRACK2);
            }
        }

        List<String> inputData = new ArrayList<String>();
        for (VaultRequest request : vaultRequests) {
            inputData.add(request.getPlaintext());
        }
        clientRequest.setResponseFormat(TYPE_VAULTID);
        clientRequest.setRequestData(inputData.toArray(new String[0]));

        return clientRequest;
    }


     */
    @SuppressWarnings("unchecked")
    public List<VaultResponse> buildVaultResponses(List<VaultRequest> vaultRequests, VaultClientResponse response)
            throws VaultServiceException {
        List<VaultResponse> vaultResponseList = new ArrayList<VaultResponse>();
        if (response == null) {
            return vaultResponseList;
        }
        ArrayList<VaultClientResult> results = response.getResult();
        if (CollectionUtils.isNotEmpty(results)) {
            for (VaultClientResult vaultClientResult : results) {
                int vaultIndex = compareAndGetIndex(vaultRequests, vaultClientResult.getRequestData());
                if (vaultIndex >= 0) {
                    vaultResponseList.add(new VaultResponse(vaultClientResult.getResponseData(), vaultIndex));
                }
            }
        }
        return vaultResponseList;
    }

    // Compares the cardNumber from response and fetches the index form request
    // for that cardNumber and returns the index value.
    private int compareAndGetIndex(List<VaultRequest> vaultRequests, String cardNumber) {
        int index = -1;
        for (VaultRequest request : vaultRequests) {
            if (request.getPlaintext().trim().equals(cardNumber)) {
                index = request.getIndex();
            }
        }
        return index;
    }

    private String getType(String type){
        switch(type.toUpperCase()){
            case VaultConstants.DATA_TYPE_GIFT_CARD_NUMBER :
                return GIFT_CARD_NUMBER;
            case VaultConstants.DATA_TYPE_GIFT_CARD_PIN :
                return GIFT_CARD_PIN;
            case VaultConstants.DATA_TYPE_PASSWORD:
                return PASSWORD;
            default:
                return "";
        }
    }
}
