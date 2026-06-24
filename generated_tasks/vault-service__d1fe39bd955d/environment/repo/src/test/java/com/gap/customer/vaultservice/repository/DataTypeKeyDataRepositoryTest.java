package com.gap.customer.vaultservice.repository;

import com.gap.customer.vaultservice.dto.DataTypeKeyDataResultDTO;
import com.gap.customer.vaultservice.repository.azureSql.DataTypeKeyDataRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.data.jdbc.DataJdbcTest;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.test.context.junit.jupiter.SpringExtension;

import java.math.BigDecimal;
import java.text.ParseException;
import java.util.Date;
import java.text.SimpleDateFormat;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertFalse;

@DataJdbcTest
@ExtendWith(SpringExtension.class)
public class DataTypeKeyDataRepositoryTest {

    @Autowired
    DataTypeKeyDataRepository dataTypeKeyDataRepository;

    @Test
    void testGetDataTypeKeyDataGetByValidDateAndDataType() throws ParseException {
        String dataType = "GiftCardNumber";
        SimpleDateFormat formatter = new SimpleDateFormat("yyyy-mm-dd");
        Date startDate = formatter.parse("2005-01-10");
        Date endDate = formatter.parse("2020-01-10");

        List<DataTypeKeyDataResultDTO> dataTypeKeyDataResultDTOs = dataTypeKeyDataRepository.getDataTypeKeyDataGetByValidDateAndDataType(dataType, endDate, startDate);

        assertEquals(4, dataTypeKeyDataResultDTOs.size());
    }
}
