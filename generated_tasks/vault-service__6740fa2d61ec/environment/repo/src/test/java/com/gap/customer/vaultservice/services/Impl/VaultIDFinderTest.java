package com.gap.customer.vaultservice.services.Impl;

import com.gap.customer.vaultservice.dao.DAOFacade;
import com.gap.customer.vaultservice.dao.EncryptionRepositoryDAO;
import com.gap.customer.vaultservice.dao.PasswordRepositoryDAO;
import com.gap.customer.vaultservice.dto.EncryptedDataResultDTO;
import com.gap.customer.vaultservice.dto.PasswordResultDTO;
import com.gap.customer.vaultservice.exception.VaultServiceException;
import com.gap.customer.vaultservice.repository.azureSql.PasswordRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.springframework.test.context.junit.jupiter.SpringExtension;

import java.util.concurrent.TimeoutException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;


@ExtendWith(SpringExtension.class)
public class VaultIDFinderTest {

    @Mock
    private DAOFacade daoFacade;

    @Mock
    private PasswordRepository passwordRepository;

    @InjectMocks
    private VaultIDFinder vaultIDFinder;

    @Mock
    private EncryptionRepositoryDAO encryptionRepositoryDAO;

    @Mock
    private PasswordRepositoryDAO passwordRepositoryDAO;

    @Test
    public void shouldReturnValidVaultIdForFindVaultIdForPassword() throws VaultServiceException, TimeoutException {
        when(daoFacade.getPasswordDAOInstance()).thenReturn(passwordRepositoryDAO);
        when(passwordRepositoryDAO.getByDataTypeAndHashValue(anyString(),anyString())).thenReturn(getPasswordResultDTO());

        String vaultId= vaultIDFinder.findVaultIdForPassword("DUMMY_HASH_VALUE","Password" );

        assertEquals(vaultId, getPasswordResultDTO().getVaultId());
    }

    @Test
    public void shouldThrowTimeoutExceptionForFindVaultIdForPassword() throws VaultServiceException, TimeoutException {
        when(daoFacade.getPasswordDAOInstance()).thenReturn(passwordRepositoryDAO);
        when(passwordRepositoryDAO.getByDataTypeAndHashValue(anyString(),anyString())).thenThrow( TimeoutException.class);

        assertThrows(VaultServiceException.class,
                ()->{
                    vaultIDFinder.findVaultIdForPassword("DUMMY_HASH_VALUE","Password" );
                });
    }

    private EncryptedDataResultDTO getEncryptedDataResultDTO() {
        return EncryptedDataResultDTO.builder().vaultId("E2ED30765A0F53DE18A9465AF9B5A588").build();
    }

    private PasswordResultDTO getPasswordResultDTO() {
        return PasswordResultDTO.builder().vaultId("E2ED30765A0F53DE18A9465AF9B5A588").build();

    }
}

