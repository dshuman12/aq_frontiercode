package com.gap.customer.vaultservice.dao.Impl;

import com.gap.customer.vaultservice.dto.DataTypeResultDTO;
import com.gap.customer.vaultservice.exception.VaultServiceException;
import com.gap.customer.vaultservice.repository.azureSql.DataTypeRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.springframework.test.context.junit.jupiter.SpringExtension;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeoutException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

@ExtendWith (SpringExtension.class)
class DataTypeRepositoryDAOImplTest {

    @InjectMocks
    private DataTypeRepositoryDAOImpl dataTypeRepositoryDAO;

    @Mock
    private DataTypeRepository dataTypeRepository;

    @Test
    void shouldReturnAllDataTypes() throws VaultServiceException, TimeoutException {
        List<DataTypeResultDTO> dataTypeResultDTOList = getDataTypeResultDTOList();
        when(dataTypeRepository.dataTypeGetAll()).thenReturn(dataTypeResultDTOList);

        List<DataTypeResultDTO> actualDataTypeResultDTOList = dataTypeRepositoryDAO.dataTypeGetAll();

        assertEquals(dataTypeResultDTOList, actualDataTypeResultDTOList);
    }

    private List<DataTypeResultDTO> getDataTypeResultDTOList() {
        List<DataTypeResultDTO> dataTypeResultDTOS = new ArrayList<>();
        DataTypeResultDTO dataTypeResultDTO1 = DataTypeResultDTO.builder().dataTypeId(1).dataTypeName("GiftCardNumber").build();
        DataTypeResultDTO dataTypeResultDTO2 = DataTypeResultDTO.builder().dataTypeId(2).dataTypeName("Password").build();
        DataTypeResultDTO dataTypeResultDTO3 = DataTypeResultDTO.builder().dataTypeId(3).dataTypeName("StoredValueCardNumber").build();
        DataTypeResultDTO dataTypeResultDTO4 = DataTypeResultDTO.builder().dataTypeId(4).dataTypeName("StoredValueCardPin").build();
        dataTypeResultDTOS.add(dataTypeResultDTO1);
        dataTypeResultDTOS.add(dataTypeResultDTO2);
        dataTypeResultDTOS.add(dataTypeResultDTO3);
        dataTypeResultDTOS.add(dataTypeResultDTO4);
        return dataTypeResultDTOS;
    }
}
