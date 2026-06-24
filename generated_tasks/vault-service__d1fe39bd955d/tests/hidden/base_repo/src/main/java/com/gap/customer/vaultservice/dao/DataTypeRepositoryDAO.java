package com.gap.customer.vaultservice.dao;

import com.gap.customer.vaultservice.dto.DataTypeResultDTO;
import com.gap.customer.vaultservice.exception.ValidationException;
import com.gap.customer.vaultservice.exception.VaultServiceException;

import java.util.List;
import java.util.concurrent.TimeoutException;

public interface DataTypeRepositoryDAO {
    List<DataTypeResultDTO> dataTypeGetAll() throws VaultServiceException, TimeoutException;
}
