package com.gap.customer.vaultservice.services.Impl;


import com.gap.customer.vaultservice.dao.DAOFacade;
import com.gap.customer.vaultservice.dto.EncryptedDataResultDTO;
import com.gap.customer.vaultservice.dto.PasswordResultDTO;
import com.gap.customer.vaultservice.error.ErrorCodes;
import com.gap.customer.vaultservice.exception.VaultServiceException;
import com.gap.customer.vaultservice.repository.azureSql.PasswordRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.concurrent.TimeoutException;

@RequiredArgsConstructor
@Slf4j
@Component
public class VaultIDFinder {

    private final DAOFacade daoFacade;
    private final PasswordRepository passwordRepository;

    public String findVaultIdForEncryptedData(String hashValueForClearText, String dataType) throws VaultServiceException{
      String vaultIdForEncryptedData = null;
        EncryptedDataResultDTO encryptedDataResultDTO = null;
        try {
            encryptedDataResultDTO = daoFacade.getEncryptionDAOInstance()
                    .getEncryptedDataByDataTypeAndHashValue(hashValueForClearText, dataType);
        } catch (TimeoutException timeoutException) {
            throw new VaultServiceException(ErrorCodes.DB_TIMEOUT_ERROR, timeoutException);
        }

        if (encryptedDataResultDTO != null) {
              vaultIdForEncryptedData = encryptedDataResultDTO.getVaultId();
            if (log.isDebugEnabled()) {
                log.info("The vault ID is already exists for encryptedData : " + vaultIdForEncryptedData);
            }
        }
       return vaultIdForEncryptedData;
    }


    public String findVaultIdForPassword(String hashValueForClearText, String dataType) throws VaultServiceException {
        String vaultIdForPassword = null;
        PasswordResultDTO passwordResultDto = null;
        try {
            passwordResultDto = daoFacade.getPasswordDAOInstance().getByDataTypeAndHashValue(hashValueForClearText, dataType);
        }catch (TimeoutException timeoutException) {
            throw new VaultServiceException(ErrorCodes.DB_TIMEOUT_ERROR, timeoutException);
        }

        if (passwordResultDto != null) {
            vaultIdForPassword = passwordResultDto.getVaultId();
            if (log.isDebugEnabled()) {
                log.info("The vault ID is already exists for encryptedData : " + vaultIdForPassword);
            }
        }
        return vaultIdForPassword;
    }

}
