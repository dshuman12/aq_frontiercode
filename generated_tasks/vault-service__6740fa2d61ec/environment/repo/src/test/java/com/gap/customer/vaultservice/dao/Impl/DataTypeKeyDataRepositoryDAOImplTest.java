package com.gap.customer.vaultservice.dao.Impl;

import com.gap.customer.vaultservice.config.ResilientTimeLimitterConfig;
import com.gap.customer.vaultservice.dto.DataTypeKeyDataResultDTO;
import com.gap.customer.vaultservice.exception.VaultServiceException;
import com.gap.customer.vaultservice.repository.azureSql.DataTypeKeyDataRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.springframework.test.context.junit.jupiter.SpringExtension;

import java.math.BigDecimal;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.concurrent.TimeoutException;

import static com.gap.customer.vaultservice.util.TimelimterUtils.getAzureTimeLimiter;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith ( SpringExtension.class )
class DataTypeKeyDataRepositoryDAOImplTest {

    @InjectMocks
    private DataTypeKeyDataRepositoryDAOImpl dataTypeKeyDataRepositoryDAO;

    @Mock
    private DataTypeKeyDataRepository dataTypeKeyDataRepository;

    @Mock
    private ResilientTimeLimitterConfig resilientTimeLimitterConfig;

    @Test
    void shouldReturnDataTypeKeyDataByValidDateAndDataType() throws ParseException, VaultServiceException, TimeoutException {
        String dataType = "GiftCardNumber";
        SimpleDateFormat formatter = new SimpleDateFormat("yyyy-mm-dd");
        Date currentDate = formatter.parse("2022-03-21");
        Date currentDateDup = formatter.parse("2022-03-21");
        List<DataTypeKeyDataResultDTO> dataTypeKeyDataResultDTOList = getDataTypeKeyDataResultDTOList();
        when(dataTypeKeyDataRepository.getDataTypeKeyDataGetByValidDateAndDataType(anyString(), any(), any()))
                .thenReturn(dataTypeKeyDataResultDTOList);
        when(resilientTimeLimitterConfig.getAzureDbTimeLimiter())
                .thenReturn(getAzureTimeLimiter());

        List<DataTypeKeyDataResultDTO> dataTypeKeyDataResultDTOS = dataTypeKeyDataRepositoryDAO
                .getDataTypeKeyDataGetByValidDateAndDataType(dataType, currentDate, currentDateDup);

        assertEquals(dataTypeKeyDataResultDTOList, dataTypeKeyDataResultDTOS);
    }

    private List<DataTypeKeyDataResultDTO> getDataTypeKeyDataResultDTOList() throws ParseException {
        List<DataTypeKeyDataResultDTO> dataTypeKeyDataResultDTOS = new ArrayList<>();
        SimpleDateFormat formatter = new SimpleDateFormat("yyyy-mm-dd");
        Date startDate = formatter.parse("2010-03-24");
        Date endDate = formatter.parse("9999-01-01");
        Date creationDate = formatter.parse("2010-03-24");
        Date lastUpdatedDate = formatter.parse("2010-03-24");

        DataTypeKeyDataResultDTO dataTypeKeyDataResultDTO = DataTypeKeyDataResultDTO.builder()
                .dtektDataTypEcrpKeyId(BigDecimal.valueOf(573851986)).dtektKeyEffEndDt(endDate)
                .dtektKeyEffStrtDt(startDate).dtektHashAlgrId(BigDecimal.valueOf(21))
                .dtektDataTypId(BigDecimal.valueOf(1)).dtektEcrpKeyId(BigDecimal.valueOf(1401526533))
                .dtektCrtDttm(creationDate).dtektLstUpdtDttm(lastUpdatedDate)
                .dtektLstUpdtUserId("2010-Rotation").hatHashAlgrId(BigDecimal.valueOf(21))
                .hatHashAlgrNm("SHA-1").ektEcrpKeyId(BigDecimal.valueOf(1401526533))
                .ektKeyPvdrNm("IngrianProvider").ektKeyAlgrTxt("AES/CBC/PKCS5Padding")
                .dttDataTypId(BigDecimal.valueOf(1)).dttDataTypNm("GiftCardNumber").build();

        dataTypeKeyDataResultDTOS.add(dataTypeKeyDataResultDTO);
        return dataTypeKeyDataResultDTOS;
    }
}
