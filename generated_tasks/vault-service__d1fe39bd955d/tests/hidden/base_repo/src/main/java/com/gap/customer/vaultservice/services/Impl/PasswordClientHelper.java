package com.gap.customer.vaultservice.services.Impl;

import com.gap.customer.vaultservice.dao.DAOFacade;
import com.gap.customer.vaultservice.dto.PasswordResultDTO;
import com.gap.customer.vaultservice.error.ErrorCodes;
import com.gap.customer.vaultservice.exception.DataNotFoundException;
import com.gap.customer.vaultservice.exception.VaultServiceException;
import com.gap.customer.vaultservice.models.VaultID;
import com.gap.customer.vaultservice.repository.azureSql.PasswordRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.concurrent.TimeoutException;

@RequiredArgsConstructor
@Component
public class PasswordClientHelper {

    private final PasswordRepository passwordRepository;
    private final DAOFacade daoFacade;

    public PasswordResultDTO getPasswordDataResultDTO(String vaultId) throws DataNotFoundException , VaultServiceException {
        PasswordResultDTO passwordResultDTO = null;
        try {
            passwordResultDTO = daoFacade.getPasswordDAOInstance().getByVaultId(vaultId);
        } catch (TimeoutException timeoutException) {
            throw new VaultServiceException(ErrorCodes.DB_TIMEOUT_ERROR, timeoutException);
        }

        if (passwordResultDTO == null) {
            throw new DataNotFoundException("Password is not found for vaultID");
        }
        return passwordResultDTO;
    }


    public String createVaultIDForNullPasswordData(String appName, String hashValueForClearText, byte[] cipherText, BigDecimal encryptedKeyId){
        var  createVaultIDForClearText = new VaultID();
        daoFacade.getPasswordDAOInstance().insert(createVaultIDForClearText.getId(), cipherText, hashValueForClearText , encryptedKeyId, appName);

        return createVaultIDForClearText.getId();

    }

}
