package com.gap.customer.vaultservice.services.Impl;

import com.gap.customer.vaultservice.dao.DAOFacade;
import com.gap.customer.vaultservice.dao.Impl.PasswordRepositoryDAOImpl;
import com.gap.customer.vaultservice.dto.PasswordResultDTO;
import com.gap.customer.vaultservice.exception.VaultServiceException;
import com.gap.customer.vaultservice.repository.azureSql.PasswordRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.springframework.test.context.junit.jupiter.SpringExtension;

import java.util.concurrent.TimeoutException;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(SpringExtension.class)
class PasswordClientHelperTest {

    @Mock
    private PasswordRepository passwordRepository;

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
    public void shouldThrowExceptionWhenVaultIdIsNotPresentInDatabase() throws VaultServiceException, TimeoutException {
        when(daoFacade.getPasswordDAOInstance()).thenReturn(passwordRepositoryDAOImpl);
        when(daoFacade.getPasswordDAOInstance().getByVaultId(anyString())).thenReturn(null);

        assertThrows(Exception.class, ()-> passwordClientHelper.getPasswordDataResultDTO(anyString()));
    }


    private PasswordResultDTO getValidPasswordDataResultDTO() {
        return PasswordResultDTO.builder()
                .cipherText(("cipherText").getBytes())
                .build();
    }
}