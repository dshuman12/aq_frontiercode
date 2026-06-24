package com.gap.customer.vaultservice.dao.Impl;

import com.gap.customer.vaultservice.dao.DataTypeRepositoryDAO;
import com.gap.customer.vaultservice.dto.DataTypeResultDTO;
import com.gap.customer.vaultservice.exception.VaultServiceException;
import com.gap.customer.vaultservice.repository.azureSql.DataTypeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.concurrent.TimeoutException;

@Component
@RequiredArgsConstructor
public class DataTypeRepositoryDAOImpl implements DataTypeRepositoryDAO {

    private final DataTypeRepository dataTypeRepository;

    @Override
    public List<DataTypeResultDTO> dataTypeGetAll() throws TimeoutException, VaultServiceException {
        return dataTypeRepository.dataTypeGetAll();
    }
}
