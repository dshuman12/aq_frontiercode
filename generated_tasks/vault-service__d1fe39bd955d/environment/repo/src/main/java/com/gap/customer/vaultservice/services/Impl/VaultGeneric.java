package com.gap.customer.vaultservice.services.Impl;

import com.gap.customer.vaultservice.exception.VaultServiceException;
import com.gap.customer.vaultservice.models.VaultClientRequest;

import java.util.List;

public interface VaultGeneric<T,U> {

    List<String> store(VaultClientRequest vaultClientRequest, String appName) throws VaultServiceException;
    String retrieve(String data, String dataType, String appName) throws VaultServiceException;
    U searchByData(String data);

}
