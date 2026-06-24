package com.gap.customer.vaultservice.dao;

import com.gap.customer.vaultservice.dao.Impl.DataTypeKeyDataRepositoryDAOImpl;
import com.gap.customer.vaultservice.dao.Impl.DataTypeRepositoryDAOImpl;
import com.gap.customer.vaultservice.dao.Impl.EncryptionRepositoryDAOImpl;
import com.gap.customer.vaultservice.dao.Impl.PasswordRepositoryDAOImpl;
import com.gap.customer.vaultservice.dao.Impl.TokenRepositoryDAOImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.springframework.test.context.junit.jupiter.SpringExtension;

import static org.junit.jupiter.api.Assertions.assertEquals;

@ExtendWith(SpringExtension.class)
class DAOFacadeTest {

    @InjectMocks
    private DAOFacade daoFacade;

    @Mock
    TokenRepositoryDAOImpl tokenRepositoryDAO;

    @Mock
    EncryptionRepositoryDAOImpl encryptionRepositoryDAO;

    @Mock
    DataTypeRepositoryDAOImpl dataTypeRepositoryDAO;

    @Mock
    DataTypeKeyDataRepositoryDAOImpl dataTypeKeyDataRepositoryDAO;

    @Mock
    PasswordRepositoryDAOImpl passwordRepositoryDAO;

    @Test
    void shouldReturnEncryptionRepositoryDAOForAzure() {
        EncryptionRepositoryDAO daoInstance = daoFacade.getEncryptionDAOInstance();

        assertEquals(encryptionRepositoryDAO, daoInstance);
    }

    @Test
    void shouldReturnTokenRepositoryDAOForAzure() {
        TokenRepositoryDAO daoInstance = daoFacade.getTokenDAOInstance();

        assertEquals(tokenRepositoryDAO, daoInstance);
    }

    @Test
    void shouldReturnDataTypeRepositoryDAOForAzure() {
        DataTypeRepositoryDAO daoInstance = daoFacade.getDataTypeDAOInstance();

        assertEquals(dataTypeRepositoryDAO, daoInstance);
    }

    @Test
    void shouldReturnDataTypeKeyDataRepositoryDAOForAzure() {
        DataTypeKeyDataRepositoryDAO daoInstance = daoFacade.getDataTypeKeyDataDAOInstance();

        assertEquals(dataTypeKeyDataRepositoryDAO, daoInstance);
    }

    @Test
    void shouldReturnPasswordRepositoryDAOForAzure() {
        PasswordRepositoryDAO daoInstance = daoFacade.getPasswordDAOInstance();

        assertEquals(passwordRepositoryDAO, daoInstance);
    }

}