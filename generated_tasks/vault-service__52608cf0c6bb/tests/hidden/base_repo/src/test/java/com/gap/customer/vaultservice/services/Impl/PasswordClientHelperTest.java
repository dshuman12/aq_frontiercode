package com.gap.customer.vaultservice.services.Impl;

import com.gap.customer.vaultservice.dao.DAOFacade;
import com.gap.customer.vaultservice.dao.Impl.PasswordRepositoryDAOImpl;
import com.gap.customer.vaultservice.dto.PasswordResultDTO;
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
import static org.mockito.Mockito.when;

@ExtendWith(SpringExtension.class)
class PasswordClientHelperTest {

    @Mock
    private DAOFacade daoFacade;

    @Mock
    private PasswordRepositoryDAOImpl passwordRepositoryDAOImpl;

    @InjectMocks
    private PasswordClientHelper passwordClientHelper;

    @Test
    public void shouldReturnPasswordDTOWhenVaultIdIsPresentInDatabase() throws Exception {
        when(daoFacade.getPasswordDAOInstance()).thenReturn(passwordRepositoryDAOImpl);
        when(daoFacade.getPasswordDAOInstance().getByVaultId(anyString())).thenReturn(getValidPasswordDataResultDTO());

        assertNotNull(passwordClientHelper.getPasswordDataResultDTO("26DD0155DFBB037CCAE71ADBCA67A689"));
    }

    @Test
    public void shouldThrowDataNotFoundExceptionWhenVaultIdIsNotPresentInDatabase() throws VaultServiceException, TimeoutException {
        DataNotFoundException expectedException = new DataNotFoundException("Password is not found for vaultID");

        when(daoFacade.getPasswordDAOInstance()).thenReturn(passwordRepositoryDAOImpl);
        when(daoFacade.getPasswordDAOInstance().getByVaultId(anyString())).thenReturn(null);

        DataNotFoundException actualException = assertThrows(DataNotFoundException.class, () ->
                passwordClientHelper.getPasswordDataResultDTO("4D5D7B4B3C63DA01C429342FEAB584B5"));
        assertEquals(expectedException.getMessage(), actualException.getMessage());

        }

        @Test
        public void shouldThrowVaultServiceExceptionWhenDAOThrowsTimeoutException() throws VaultServiceException, TimeoutException {
            VaultServiceException expectedException = new VaultServiceException("19");

            when(daoFacade.getPasswordDAOInstance()).thenReturn(passwordRepositoryDAOImpl);
            when(daoFacade.getPasswordDAOInstance().getByVaultId(any())).thenThrow(new TimeoutException());

            VaultServiceException actualException =
                    assertThrows(VaultServiceException.class, () ->
                    passwordClientHelper.getPasswordDataResultDTO("4D5D7B4B3C63DA01C429342FEAB584B5" ));
            assertEquals(expectedException.getMessage(), actualException.getMessage());
        }

        @Test
        void shouldCreateAndReturnVaultIdForNullPasswordData() {
            when(daoFacade.getPasswordDAOInstance()).thenReturn(passwordRepositoryDAOImpl);
            when(passwordRepositoryDAOImpl.insert(any(), any(), any(), any(), any())).thenReturn(true);

            assertNotNull(passwordClientHelper.createVaultIDForNullPasswordData("unitTesting", "", "Password@test".getBytes(), BigDecimal.valueOf(1)));
        }

        private PasswordResultDTO getValidPasswordDataResultDTO() {
            return PasswordResultDTO.builder()
                    .cipherText(("cipherText").getBytes())
                    .build();
        }
    }