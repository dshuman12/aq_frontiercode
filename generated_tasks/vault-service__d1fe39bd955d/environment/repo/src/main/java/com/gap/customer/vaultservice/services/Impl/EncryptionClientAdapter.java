package com.gap.customer.vaultservice.services.Impl;

import com.gap.customer.vaultservice.dto.EncryptedDataResultDTO;
import com.gap.customer.vaultservice.error.ErrorEntityMessage;
import com.gap.customer.vaultservice.exception.DataNotFoundException;
import com.gap.customer.vaultservice.exception.VaultServiceException;
import com.gap.customer.vaultservice.security.CipherHashAlgorithm;
import com.gap.customer.vaultservice.security.DataTypeKeyDataUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@Slf4j
@RequiredArgsConstructor
public class EncryptionClientAdapter {

    private final EncryptionClientHelper encryptionClientHelper;
    private final VaultIDFinder vaultIDFinder;
    private final DataTypeKeyDataUtil dataTypeKeyDataUtil;
    private final CipherHashAlgorithm cipherHashAlgorithm;
    private final CipherClientAdapter cipherClientAdapter;


    //TODO: to be implemented

    /*
     Algorithm:
            1. get ciphertext from oracle using vaultID and datatype
            2. decrypt ciphertext with ingrian to retrieve cleartext
            3. return cleartext

     */

    public String retrieve(String vaultId, String dataType) throws VaultServiceException {
        try {
            EncryptedDataResultDTO encryptedDataResultDTO = encryptionClientHelper.getEncryptedDataResultDTO(vaultId);
            if (!dataType.equals(encryptedDataResultDTO.getDataType())) {
                throw new DataNotFoundException("EncryptedDataResult is not found for vaultID");
            }
            var dataTypeResultDTOForDataType = dataTypeKeyDataUtil.getDataTypeKeyData(dataType);
            return cipherClientAdapter.getDecryptedText(encryptedDataResultDTO.getCipherText(), dataTypeResultDTOForDataType);
        }
        catch (DataNotFoundException dataNotFoundException) {
            return ErrorEntityMessage.INVALID_VAULT_ID_MESSAGE;
        }
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
        vaultId = vaultIDFinder.findVaultIdForEncryptedData(hashValueForClearText, dataType);
        if (vaultId == null) {
            var dataTypeKeyData = dataTypeKeyDataUtil.getDataTypeKeyData(dataType);
            var cipherText = cipherClientAdapter.getEncryptedText(clearText, dataTypeKeyData);
            vaultId = encryptionClientHelper.createVaultIDForNullEncryptedData(appName, hashValueForClearText, cipherText,
                    dataTypeKeyData.getDtektDataTypEcrpKeyId());
            if (log.isDebugEnabled()) {
                log.info("The vault ID created  for encryptedData : " + vaultId);
            }
        }
        return vaultId;
    }
}
