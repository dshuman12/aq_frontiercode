package com.gap.customer.vaultservice.dao;

import com.gap.customer.vaultservice.dto.EncryptedDataResultDTO;
import com.gap.customer.vaultservice.exception.VaultServiceException;

import java.math.BigDecimal;
import java.util.Date;
import java.util.concurrent.TimeoutException;

public interface EncryptionRepositoryDAO {

    EncryptedDataResultDTO getEncryptedDataByDataTypeAndHashValue(String hashValue, String dataType) throws VaultServiceException, TimeoutException;

    EncryptedDataResultDTO getEncryptedDataByVaultId(String vaultId) throws VaultServiceException, TimeoutException;

    void insertEncryptedData(String vaultId, byte[] cipherText, String hashValue, BigDecimal dataTypeKeyDataId, String appName);

}
