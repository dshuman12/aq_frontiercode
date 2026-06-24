package com.gap.gid.tests;

import java.security.SecureRandom;

public interface VaultSecuredData {

    default String generateSecuredData(){
        SecureRandom random =  new SecureRandom();
        String result = "";
        int len = VaultTestConstants.MAX_CARD_LENGTH;
        for(int idx = 0 ; idx <= len; idx++){
            result += String.valueOf(random.nextInt(VaultTestConstants.MAX_BOUND-VaultTestConstants.MIN_BOUND+1) +VaultTestConstants.MIN_BOUND);
        }
        return result;
    }

    default String generateSecuredMonth() {
        SecureRandom random = new SecureRandom();
        String month = String.valueOf(random.nextInt(VaultTestConstants.MAX_MONTH-VaultTestConstants.MIN_MONTH+1) + VaultTestConstants.MIN_MONTH);
        return month;
    }
}
