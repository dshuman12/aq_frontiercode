package com.gap.customer.vaultservice.repository;

import com.gap.customer.vaultservice.dto.DataTypeResultDTO;
import com.gap.customer.vaultservice.repository.azureSql.DataTypeRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.data.jdbc.DataJdbcTest;
import org.springframework.test.context.junit.jupiter.SpringExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

@ExtendWith(SpringExtension.class)
@DataJdbcTest
public class DataTypeRepositoryTest {

    @Autowired
    DataTypeRepository dataTypeRepository;

    @Test
    void testDataTypeGetAll() {
        List<DataTypeResultDTO> dataTypeResultDTOS = dataTypeRepository.dataTypeGetAll();
        assertEquals(9, dataTypeResultDTOS.size());
    }
}