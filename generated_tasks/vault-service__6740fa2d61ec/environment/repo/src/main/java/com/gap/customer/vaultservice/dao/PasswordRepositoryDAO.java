package com.gap.customer.vaultservice.dao;

import com.gap.customer.vaultservice.dto.PasswordResultDTO;
import com.gap.customer.vaultservice.exception.VaultServiceException;

import java.math.BigDecimal;
import java.util.Date;
import java.util.concurrent.TimeoutException;

public interface PasswordRepositoryDAO {
    PasswordResultDTO getByDataTypeAndHashValue(String hashValue, String dataType) throws TimeoutException, VaultServiceException;
    PasswordResultDTO getByVaultId(String vaultId) throws TimeoutException, VaultServiceException;
    boolean insert(String id, byte[] cipherText, String hashValueForClearText, BigDecimal encryptedKeyId, String appName);
}
