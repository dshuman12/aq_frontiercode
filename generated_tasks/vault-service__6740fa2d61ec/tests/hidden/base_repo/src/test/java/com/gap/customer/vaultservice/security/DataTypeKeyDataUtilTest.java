package com.gap.customer.vaultservice.security;

import com.gap.customer.vaultservice.dao.DAOFacade;
import com.gap.customer.vaultservice.dao.DataTypeKeyDataRepositoryDAO;
import com.gap.customer.vaultservice.dto.DataTypeKeyDataResultDTO;
import com.gap.customer.vaultservice.exception.VaultServiceException;
import com.gap.customer.vaultservice.models.VaultFeatureToggle;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.springframework.test.context.junit.jupiter.SpringExtension;

import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeoutException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(SpringExtension.class)
public class DataTypeKeyDataUtilTest {

    @Mock
    private CipherLogger LOGGER;

    @Mock
    private DAOFacade daoFacade;

    @Mock
    private VaultFeatureToggle vaultFeatureToggle;

    @Mock
    private DataTypeKeyDataRepositoryDAO dataTypeKeyDataRepositoryDAO;

    @InjectMocks
    private DataTypeKeyDataUtil dataTypeKeyDataUtil;


    @Test
    public void shouldReturnListOfDataTypeKeyDataResultDTOForGetDataTypeList() throws VaultServiceException, TimeoutException {

        when(daoFacade.getDataTypeKeyDataDAOInstance()).thenReturn(dataTypeKeyDataRepositoryDAO);
        when(daoFacade.getDataTypeKeyDataDAOInstance().getDataTypeKeyDataGetByValidDateAndDataType(anyString(),any(Timestamp.class)
                ,any(Timestamp.class))).thenReturn(getDataTypeKeyDataResultDTOs());

        Timestamp timestamp = new Timestamp(System.currentTimeMillis());
        List<DataTypeKeyDataResultDTO> actualResponse = dataTypeKeyDataUtil.getDataTypeList("DUMMY_DATA_TYPE",timestamp,timestamp);

        assertEquals(2, actualResponse.size());
    }

    @Test
    public void shouldThrowVaultServiceExceptionForGetDataTypeListWhenGetDataTypeListTimesout() throws VaultServiceException, TimeoutException {

        when(daoFacade.getDataTypeKeyDataDAOInstance()).thenReturn(dataTypeKeyDataRepositoryDAO);
        when(daoFacade.getDataTypeKeyDataDAOInstance().getDataTypeKeyDataGetByValidDateAndDataType(anyString(),any(Timestamp.class)
                ,any(Timestamp.class))).thenThrow(TimeoutException.class);

        Timestamp timestamp = new Timestamp(System.currentTimeMillis());
        assertThrows(VaultServiceException.class, () -> {
            dataTypeKeyDataUtil.getDataTypeList("DUMMY_DATA_TYPE",timestamp,timestamp);
        });

    }

    @Test
    public void shouldReturnListOfDataTypeKeyDataResultDTOForGetDataTypeListAtInitialization() throws VaultServiceException, TimeoutException {

        when(daoFacade.getDataTypeKeyDataDAOInstance()).thenReturn(dataTypeKeyDataRepositoryDAO);
        when(daoFacade.getDataTypeKeyDataDAOInstance().getDataTypeKeyDataGetByValidDateAndDataType(anyString(),any(Timestamp.class)
                ,any(Timestamp.class),anyBoolean())).thenReturn(getDataTypeKeyDataResultDTOs());

        Timestamp timestamp = new Timestamp(System.currentTimeMillis());
        List<DataTypeKeyDataResultDTO> actualResponse = dataTypeKeyDataUtil.getDataTypeList("DUMMY_DATA_TYPE",timestamp,timestamp,true);

        assertEquals(2, actualResponse.size());
    }

    @Test
    public void shouldReturnListOfDataTypeKeyDataResultDTOForGetDataTypeKeyData() throws VaultServiceException, TimeoutException {

        when(daoFacade.getDataTypeKeyDataDAOInstance()).thenReturn(dataTypeKeyDataRepositoryDAO);
        when(daoFacade.getDataTypeKeyDataDAOInstance().getDataTypeKeyDataGetByValidDateAndDataType(anyString(),any(Timestamp.class)
                ,any(Timestamp.class))).thenReturn(getDataTypeKeyDataResultDTOs());

        Timestamp timestamp = new Timestamp(System.currentTimeMillis());
        DataTypeKeyDataResultDTO actualResponse = dataTypeKeyDataUtil.getDataTypeKeyData("DUMMY_DATA_TYPE");

        assertEquals("DUMMY_KEY_NAME1", actualResponse.getEktKeyNm());
    }

    @Test
    public void shouldThrowVaultServiceExceptionForGetDataTypeKeyDataWhenGetDataTypeListTimesout() throws VaultServiceException, TimeoutException {

        when(daoFacade.getDataTypeKeyDataDAOInstance()).thenReturn(dataTypeKeyDataRepositoryDAO);
        when(daoFacade.getDataTypeKeyDataDAOInstance().getDataTypeKeyDataGetByValidDateAndDataType(anyString(),any(Timestamp.class)
                ,any(Timestamp.class))).thenThrow(TimeoutException.class);

        assertThrows(VaultServiceException.class, () -> {
            dataTypeKeyDataUtil.getDataTypeKeyData("DUMMY_DATA_TYPE");
        });
    }

    private List<DataTypeKeyDataResultDTO> getDataTypeKeyDataResultDTOs() {
        List<DataTypeKeyDataResultDTO> dataTypeKeyDataResultDTOS= new ArrayList<>();
        DataTypeKeyDataResultDTO dataTypeKeyDataResultDTO1= DataTypeKeyDataResultDTO.builder().ektKeyNm("DUMMY_KEY_NAME1").build();
        dataTypeKeyDataResultDTOS.add(dataTypeKeyDataResultDTO1);
        DataTypeKeyDataResultDTO dataTypeKeyDataResultDTO2= DataTypeKeyDataResultDTO.builder().ektKeyNm("DUMMY_KEY_NAME2").build();
        dataTypeKeyDataResultDTOS.add(dataTypeKeyDataResultDTO2);

        return dataTypeKeyDataResultDTOS;
    }

    private DataTypeKeyDataResultDTO getDataTypeKeyDataResultDTO() {
        DataTypeKeyDataResultDTO dataTypeKeyDataResultDTO= DataTypeKeyDataResultDTO.builder().ektKeyNm("DUMMY_KEY_NAME").build();
        return dataTypeKeyDataResultDTO;
    }

}
