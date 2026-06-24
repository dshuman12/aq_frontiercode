package com.gap.customer.vaultservice.dao;

import com.gap.customer.vaultservice.dto.EncryptedDataResultDTO;
import com.gap.customer.vaultservice.exception.VaultServiceException;
import com.gap.gid.security.dto.BluefinTokenDTO;

import java.math.BigDecimal;
import java.util.concurrent.TimeoutException;

public interface EncryptionRepositoryDAO {

    EncryptedDataResultDTO getEncryptedDataByDataTypeAndHashValue(String hashValue, String dataType)
            throws VaultServiceException, TimeoutException;

    EncryptedDataResultDTO getEncryptedDataByVaultId(String vaultId) throws VaultServiceException, TimeoutException;

    void insertEncryptedData(String vaultId, byte[] cipherText, String hashValue, BigDecimal dataTypeKeyDataId,
                             String appName, BluefinTokenDTO bluefinTokenDTO);

    void updateToken(String vaultId, BluefinTokenDTO bluefinTokenDTO, String appName);
}
