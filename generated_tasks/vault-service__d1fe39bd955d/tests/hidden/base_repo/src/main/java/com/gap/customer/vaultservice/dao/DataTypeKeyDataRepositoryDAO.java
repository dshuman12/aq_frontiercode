package com.gap.customer.vaultservice.dao;

import com.gap.customer.vaultservice.dto.DataTypeKeyDataResultDTO;
import com.gap.customer.vaultservice.exception.VaultServiceException;

import java.util.Date;
import java.util.List;
import java.util.concurrent.TimeoutException;

public interface DataTypeKeyDataRepositoryDAO {
    List<DataTypeKeyDataResultDTO> getDataTypeKeyDataGetByValidDateAndDataType(String dataType, Date currentDate, Date currentDateDup, Boolean isInitialized) throws TimeoutException, VaultServiceException;
    List<DataTypeKeyDataResultDTO> getDataTypeKeyDataGetByValidDateAndDataType(String dataType, Date currentDate, Date currentDateDup) throws TimeoutException, VaultServiceException;
}
