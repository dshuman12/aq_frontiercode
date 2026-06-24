package com.gap.customer.vaultservice.services.Impl;

import com.gap.customer.vaultservice.dao.DAOFacade;
import com.gap.customer.vaultservice.dao.Impl.EncryptionRepositoryDAOImpl;
import com.gap.customer.vaultservice.dto.EncryptedDataResultDTO;
import com.gap.customer.vaultservice.exception.DataNotFoundException;
import com.gap.customer.vaultservice.exception.VaultServiceException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.springframework.test.context.junit.jupiter.SpringExtension;

import java.math.BigDecimal;
import java.util.concurrent.TimeoutException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;

@ExtendWith(SpringExtension.class)
class EncryptionClientHelperTest {

    @Mock
    private DAOFacade daoFacade;

    @Mock
    private EncryptionRepositoryDAOImpl encryptionRepositoryDAOImpl;

    @InjectMocks
    private EncryptionClientHelper encryptionClientHelper;

    @Test
    public void shouldReturnEncryptedDataResultDTOWhenTheVaultIdIsPresentInDatabase() throws VaultServiceException, TimeoutException {
        when(daoFacade.getEncryptionDAOInstance()).thenReturn(encryptionRepositoryDAOImpl);
        when(encryptionRepositoryDAOImpl.getEncryptedDataByVaultId(anyString())).thenReturn(getValidEncryptedDataResultDTO());

        assertNotNull(encryptionClientHelper.getEncryptedDataResultDTO("26DD0155DFBB037CCAE71ADBCA67A689"));
    }

    @Test
    void shouldThrowDataNotFoundExceptionIfTheGivenVaultIdIsNotPresentInDatabase() throws VaultServiceException, TimeoutException {
        DataNotFoundException expectedException = new DataNotFoundException("EncryptedData is not found for given vaultID");

        when(daoFacade.getEncryptionDAOInstance()).thenReturn(encryptionRepositoryDAOImpl);
        when(encryptionRepositoryDAOImpl.getEncryptedDataByVaultId(anyString())).thenReturn(null);

        DataNotFoundException actualResult = assertThrows(DataNotFoundException.class, () -> {
            encryptionClientHelper.getEncryptedDataResultDTO("26DD0155DFBB037CCAE71ADBCA67A689");
        });
        assertEquals(expectedException.getMessage(), actualResult.getMessage());
    }

    @Test
    void shouldThrowVaultServiceExceptionIfDAOThrowsTimeoutException() throws VaultServiceException, TimeoutException {
        VaultServiceException expectedException = new VaultServiceException("19");

        when(daoFacade.getEncryptionDAOInstance()).thenReturn(encryptionRepositoryDAOImpl);
        when(encryptionRepositoryDAOImpl.getEncryptedDataByVaultId(anyString())).thenThrow(new TimeoutException());

        VaultServiceException actualException = assertThrows(VaultServiceException.class, () -> {
            encryptionClientHelper.getEncryptedDataResultDTO("26DD0155DFBB037CCAE71ADBCA67A689");
        });
        assertEquals(expectedException.getMessage(), actualException.getMessage());
    }

    @Test
    void shouldCreateAndReturnVaultIdForNullEncryptedData() {
        when(daoFacade.getEncryptionDAOInstance()).thenReturn(encryptionRepositoryDAOImpl);
        doNothing().when(encryptionRepositoryDAOImpl).insertEncryptedData(any(), any(), any(), any(), any());

        assertNotNull(encryptionClientHelper.createVaultIDForNullEncryptedData("unitTesting", "", "Giftcard@test".getBytes(), BigDecimal.valueOf(1)));
    }

    private EncryptedDataResultDTO getValidEncryptedDataResultDTO() {
        return EncryptedDataResultDTO.builder()
                .cipherText(("cipherText").getBytes())
                .hashValue("dummyHash")
                .build();
    }
}