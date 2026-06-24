package com.gap.customer.vaultservice.services.Impl;

import com.gap.customer.vaultservice.dao.DAOFacade;
import com.gap.customer.vaultservice.dto.EncryptedDataResultDTO;
import com.gap.customer.vaultservice.error.ErrorCodes;
import com.gap.customer.vaultservice.exception.DataNotFoundException;
import com.gap.customer.vaultservice.exception.VaultServiceException;
import com.gap.customer.vaultservice.models.VaultID;
import com.gap.gid.security.dto.BluefinTokenDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.concurrent.TimeoutException;

@RequiredArgsConstructor
@Slf4j
@Component
public class EncryptionClientHelper {

    private final DAOFacade daoFacade;

    public EncryptedDataResultDTO getEncryptedDataResultDTO(String vaultId) throws DataNotFoundException , VaultServiceException{
        EncryptedDataResultDTO encryptedDataResultDto = null;
        try {
            encryptedDataResultDto = daoFacade.getEncryptionDAOInstance().getEncryptedDataByVaultId(vaultId);
        } catch (TimeoutException timeoutException) {
            throw new VaultServiceException(ErrorCodes.DB_TIMEOUT_ERROR, timeoutException);
        }

        if (encryptedDataResultDto == null) {
            throw new DataNotFoundException("EncryptedData is not found for given vaultID");
        }
        return encryptedDataResultDto;
    }


    public String createVaultIDForNullEncryptedData(String appName, String hashValueForClearText, byte[] cipherText,
                                                    BigDecimal encryptedKeyId, BluefinTokenDTO bluefinTokenDTO) {
        var createVaultIDForClearText = new VaultID();
        daoFacade.getEncryptionDAOInstance().insertEncryptedData(
                createVaultIDForClearText.getId(),
                cipherText,
                hashValueForClearText,
                encryptedKeyId,
                appName,
                bluefinTokenDTO);
        return createVaultIDForClearText.getId();
    }

    public EncryptedDataResultDTO findVaultIdForEncryptedData(String hashValueForClearText, String dataType) throws VaultServiceException{
        EncryptedDataResultDTO encryptedDataResultDTO;
        try {
            encryptedDataResultDTO = daoFacade.getEncryptionDAOInstance()
                    .getEncryptedDataByDataTypeAndHashValue(hashValueForClearText, dataType);
        } catch (TimeoutException timeoutException) {
            throw new VaultServiceException(ErrorCodes.DB_TIMEOUT_ERROR, timeoutException);
        }

        if (encryptedDataResultDTO != null) {
            if (log.isDebugEnabled()) {
                log.info("The vault ID is already exists for encryptedData : " + encryptedDataResultDTO.getVaultId());
            }
        }
        return encryptedDataResultDTO;
    }

    public void updateBluefinDetails(String vaultId, BluefinTokenDTO bluefinTokenDTO, String appName) {
        daoFacade.getEncryptionDAOInstance().updateToken(vaultId, bluefinTokenDTO, appName);
    }
}
