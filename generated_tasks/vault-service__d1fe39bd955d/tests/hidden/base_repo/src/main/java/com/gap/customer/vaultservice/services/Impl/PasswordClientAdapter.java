package com.gap.customer.vaultservice.services.Impl;

import com.gap.customer.vaultservice.exception.VaultServiceException;
import com.gap.customer.vaultservice.models.VaultFeatureToggle;
import com.gap.customer.vaultservice.security.CipherHashAlgorithm;
import com.gap.customer.vaultservice.security.DataTypeKeyDataUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
@Slf4j
@RequiredArgsConstructor
public class PasswordClientAdapter {

    private static final Logger LOGGER = LoggerFactory.getLogger(PasswordClientAdapter.class);
    private final PasswordClientHelper passwordClientHelper;
    private final VaultIDFinder vaultIDFinder;
    private final DataTypeKeyDataUtil dataTypeKeyDataUtil;
    private final CipherHashAlgorithm cipherHashAlgorithm;
    private final CipherClientAdapter cipherClientAdapter;
    private final VaultFeatureToggle vaultFeatureToggle;

    public String retrieve(String vaultId, String dataType) throws VaultServiceException {
        if (log.isDebugEnabled()) {
            log.info("Match Request with {} and VAULT_ID}", dataType);
        }
        var cipherTextForVaultId = passwordClientHelper.getPasswordDataResultDTO(vaultId).getCipherText();
        var dataTypeResultDTOForDataType = dataTypeKeyDataUtil.getDataTypeKeyData(dataType);
        var clearTextForVaultId = cipherClientAdapter.getDecryptedText(cipherTextForVaultId, dataTypeResultDTOForDataType);
        return clearTextForVaultId;
    }

    /*
      Algorithm:
             1. if the cleartext data is already stored in the vault, then simply return the existing vaultId,
             otherwise
             2. encrypt cleartext data -> get ciphertext from ingrian
             3. generate vaultId
             4. store ciphertext data in database under datatype-specific table, using vaultId primary key
             5. return vaultId
     */
    public String store(String clearText, String dataType, String appName) throws VaultServiceException {
        String vaultId;
        String hashValueForClearText = cipherHashAlgorithm.getHashValue(clearText, dataType);
        vaultId = vaultIDFinder.findVaultIdForPassword(hashValueForClearText, dataType);
        if (vaultId == null) {
            var dataTypeKeyData = dataTypeKeyDataUtil.getDataTypeKeyData(dataType);
            var cipherText = cipherClientAdapter.getEncryptedText(clearText, dataTypeKeyData);
            vaultId = passwordClientHelper.createVaultIDForNullPasswordData(appName, hashValueForClearText, cipherText, dataTypeKeyData.getDtektDataTypEcrpKeyId());
            if (log.isDebugEnabled()) {
                log.info("The vault ID created for passwordData : " + vaultId);
            }
        }
        return vaultId;
    }
}
