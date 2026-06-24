package com.gap.customer.vaultservice.services.Impl;

import com.gap.customer.vaultservice.dto.EncryptedDataResultDTO;
import com.gap.customer.vaultservice.error.ErrorEntityMessage;
import com.gap.customer.vaultservice.exception.DataNotFoundException;
import com.gap.customer.vaultservice.exception.VaultServiceException;
import com.gap.customer.vaultservice.models.VaultFeatureToggle;
import com.gap.customer.vaultservice.security.CipherHashAlgorithm;
import com.gap.customer.vaultservice.security.DataTypeKeyDataUtil;
import com.gap.customer.vaultservice.util.BluefinUtil;
import com.gap.gid.security.adapter.BluefinAdapter;
import com.gap.gid.security.dto.BluefinTokenDTO;
import com.gap.gid.security.exception.BluefinException;
import com.gap.gid.security.exception.BluefinTimeoutException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@Slf4j
@RequiredArgsConstructor
public class EncryptionClientAdapter {

    private final EncryptionClientHelper encryptionClientHelper;
    private final DataTypeKeyDataUtil dataTypeKeyDataUtil;
    private final CipherHashAlgorithm cipherHashAlgorithm;
    private final CipherClientAdapter cipherClientAdapter;
    private final BluefinAdapter bluefinAdapter;
    private final VaultFeatureToggle vaultFeatureToggle;

    public String retrieve(String vaultId, String dataType) throws VaultServiceException {
        try {
            EncryptedDataResultDTO encryptedDataResultDTO = encryptionClientHelper.getEncryptedDataResultDTO(vaultId);
            if (!dataType.equals(encryptedDataResultDTO.getDataType())) {
                throw new DataNotFoundException("EncryptedDataResult is not found for vaultID");
            }
            var dataTypeResultDTOForDataType = dataTypeKeyDataUtil.getDataTypeKeyData(dataType);
            return cipherClientAdapter.getDecryptedText(encryptedDataResultDTO.getCipherText(), dataTypeResultDTOForDataType);
        } catch (DataNotFoundException dataNotFoundException) {
            return ErrorEntityMessage.INVALID_VAULT_ID_MESSAGE;
        }
    }

    public String store(String clearText, String dataType, String appName) throws VaultServiceException {
        String hashValueForClearText = cipherHashAlgorithm.getHashValue(clearText, dataType);
        EncryptedDataResultDTO encryptedData = encryptionClientHelper.findVaultIdForEncryptedData(hashValueForClearText, dataType);
        if (encryptedData == null) {
            return createEncryptedData(clearText, dataType, appName, hashValueForClearText);
        } else if (encryptedData.getBfToken() == null && encryptedData.getBfId() == null) {
            updateBluefinToken(clearText, dataType, appName, encryptedData);
        }
        return encryptedData.getVaultId();
    }

    private String createEncryptedData(String clearText, String dataType, String appName, String hashValueForClearText) throws VaultServiceException {
        BluefinTokenDTO bluefinTokenDTO = null;
        if (vaultFeatureToggle.isBluefinFor01TEnabled()) {
            bluefinTokenDTO = getBluefinTokenDTO(clearText, dataType);
        }
        var dataTypeKeyData = dataTypeKeyDataUtil.getDataTypeKeyData(dataType);
        var cipherText = cipherClientAdapter.getEncryptedText(clearText, dataTypeKeyData);
        String vaultId = encryptionClientHelper.createVaultIDForNullEncryptedData(appName, hashValueForClearText, cipherText,
                dataTypeKeyData.getDtektDataTypEcrpKeyId(), bluefinTokenDTO);
        if (log.isDebugEnabled()) {
            log.info("The vault ID created  for encryptedData : " + vaultId);
        }
        return vaultId;
    }

    private void updateBluefinToken(String clearText, String dataType, String appName, EncryptedDataResultDTO encryptedData) throws VaultServiceException {
        if (vaultFeatureToggle.isBluefinFor01TEnabled()) {
            BluefinTokenDTO bluefinTokenDTO = getBluefinTokenDTO(clearText, dataType);
            encryptionClientHelper.updateBluefinDetails(encryptedData.getVaultId(), bluefinTokenDTO, appName);
        }
    }

    private BluefinTokenDTO getBluefinTokenDTO(String clearText, String dataType) throws VaultServiceException {
        try {
            return bluefinAdapter.tokenize(clearText, BluefinUtil.getBluefinDatatype(dataType));
        } catch (BluefinException | BluefinTimeoutException e) {
            throw new VaultServiceException(e);
        }
    }
}
