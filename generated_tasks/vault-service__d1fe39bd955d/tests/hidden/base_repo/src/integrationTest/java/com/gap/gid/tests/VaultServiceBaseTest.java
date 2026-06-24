package com.gap.gid.tests;


public class VaultServiceBaseTest implements VaultSecuredData {

    private String securedInputData;

    public String getSecuredMonth() {
        return generateSecuredMonth();
    }

    private String seuredMonth;

    public String getSecuredInputData() {
        return generateSecuredData();
    }
}
