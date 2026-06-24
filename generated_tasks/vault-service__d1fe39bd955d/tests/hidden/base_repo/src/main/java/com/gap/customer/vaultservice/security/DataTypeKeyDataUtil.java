package com.gap.customer.vaultservice.security;

import com.gap.customer.vaultservice.dao.DAOFacade;
import com.gap.customer.vaultservice.dto.DataTypeKeyDataResultDTO;
import com.gap.customer.vaultservice.error.ErrorCodes;
import com.gap.customer.vaultservice.exception.VaultServiceException;
import com.gap.customer.vaultservice.models.VaultFeatureToggle;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.sql.Timestamp;
import java.util.Date;
import java.util.List;
import java.util.concurrent.TimeoutException;

@Component
@RequiredArgsConstructor
public class DataTypeKeyDataUtil {

    private static final CipherLogger LOGGER = new CipherLogger();
    private final DAOFacade daoFacade;
    private final VaultFeatureToggle vaultFeatureToggle;
    private Date currentDate = new Date();

    public List<DataTypeKeyDataResultDTO> getDataTypeList(String dataType, Timestamp currentDate, Timestamp currentDateDup) throws VaultServiceException {
        try {
            return daoFacade.getDataTypeKeyDataDAOInstance().getDataTypeKeyDataGetByValidDateAndDataType(dataType, currentDate, currentDateDup);
        } catch (TimeoutException timeoutException) {
            throw new VaultServiceException(ErrorCodes.DB_TIMEOUT_ERROR, timeoutException);
        }
    }

    public List<DataTypeKeyDataResultDTO> getDataTypeList(String dataType, Timestamp currentDate, Timestamp currentDateDup, Boolean isInitialized) throws VaultServiceException {
        try {
            return daoFacade.getDataTypeKeyDataDAOInstance().getDataTypeKeyDataGetByValidDateAndDataType(dataType, currentDate, currentDateDup,isInitialized);
        } catch (TimeoutException timeoutException) {
            throw new VaultServiceException(ErrorCodes.DB_TIMEOUT_ERROR, timeoutException);
        }
    }

     public DataTypeKeyDataResultDTO getDataTypeKeyData(String dataType) throws VaultServiceException {
        final String methodSignature = "DataTypeKeyData getDataTypeKeyData(String): ";

        List<DataTypeKeyDataResultDTO> dataTypeKeyDataList = null;
        String KeyData = null;

        dataTypeKeyDataList = getDataTypeList(dataType,new Timestamp(getCurrentDate().getTime()), new Timestamp(getCurrentDate().getTime()));

        if (!((dataTypeKeyDataList.size()) >= 0)) {
            throw new VaultServiceException(
                    "Could not find a valid association instance between the data type and the key data for dataType:"
                            + dataType);
        }
        DataTypeKeyDataResultDTO dataTypeKeyData = dataTypeKeyDataList.get(0);
        KeyData = dataTypeKeyData.getEktKeyNm();

        if (LOGGER.isDebugEnabled()) {
            LOGGER.debug(methodSignature + "Key data algorithm: " + dataTypeKeyData.getEktKeyAlgrTxt() + "; provider: "
                    + dataTypeKeyData.getEktKeyPvdrNm() + "; key name: " + KeyData + "; initializationVector: "
                    + dumpInitializationVector(dataTypeKeyData.getInitializationVector()));
            LOGGER.debug(methodSignature + "dataTypeKeyData: " + dataTypeKeyData + "; dataType: " + dataType);
        }

        return dataTypeKeyData;
    }

    public DataTypeKeyDataResultDTO getDataTypeKeyData(String dataType, Boolean isInitialized) throws VaultServiceException {
        final String methodSignature = "DataTypeKeyData getDataTypeKeyData(String): ";

        List<DataTypeKeyDataResultDTO> dataTypeKeyDataList = null;
        String KeyData = null;

        dataTypeKeyDataList = getDataTypeList(dataType,new Timestamp(getCurrentDate().getTime()), new Timestamp(getCurrentDate().getTime()), isInitialized);

        if (!((dataTypeKeyDataList.size()) >= 0)) {
            throw new VaultServiceException(
                    "Could not find a valid association instance between the data type and the key data for dataType:"
                            + dataType);
        }
        DataTypeKeyDataResultDTO dataTypeKeyData = dataTypeKeyDataList.get(0);
        KeyData = dataTypeKeyData.getEktKeyNm();

        if (LOGGER.isDebugEnabled()) {
            LOGGER.debug(methodSignature + "Key data algorithm: " + dataTypeKeyData.getEktKeyAlgrTxt() + "; provider: "
                    + dataTypeKeyData.getEktKeyPvdrNm() + "; key name: " + KeyData + "; initializationVector: "
                    + dumpInitializationVector(dataTypeKeyData.getInitializationVector()));
            LOGGER.debug(methodSignature + "dataTypeKeyData: " + dataTypeKeyData + "; dataType: " + dataType);
        }

        return dataTypeKeyData;
    }


     private String dumpInitializationVector(byte[] initializationVector) {
        StringBuffer sb = new StringBuffer();
        for (int i = 0; i < initializationVector.length; i++) {
            sb.append(initializationVector[i]);
        }
        return sb.toString();
     }

     private Date getCurrentDate() {
        if (System.currentTimeMillis() - currentDate.getTime() > 30000) {
            currentDate = new Date();
        }
        return currentDate;
     }
}
