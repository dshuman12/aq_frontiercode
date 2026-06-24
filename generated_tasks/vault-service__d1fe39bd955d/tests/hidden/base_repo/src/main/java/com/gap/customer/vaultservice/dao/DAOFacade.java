package com.gap.customer.vaultservice.dao;

import com.gap.customer.vaultservice.dao.Impl.DataTypeKeyDataRepositoryDAOImpl;
import com.gap.customer.vaultservice.dao.Impl.DataTypeRepositoryDAOImpl;
import com.gap.customer.vaultservice.dao.Impl.EncryptionRepositoryDAOImpl;
import com.gap.customer.vaultservice.dao.Impl.PasswordRepositoryDAOImpl;
import com.gap.customer.vaultservice.dao.Impl.TokenRepositoryDAOImpl;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DAOFacade {

    private final TokenRepositoryDAOImpl tokenRepositoryDAO;
    private final DataTypeRepositoryDAOImpl dataTypeRepositoryDAO;
    private final DataTypeKeyDataRepositoryDAOImpl dataTypeKeyDataRepositoryDAO;
    private final EncryptionRepositoryDAOImpl encryptionRepositoryDAO;
    private final PasswordRepositoryDAOImpl passwordRepositoryDAO;

    public TokenRepositoryDAO getTokenDAOInstance() {
        return tokenRepositoryDAO;
    }

    public EncryptionRepositoryDAO getEncryptionDAOInstance() {
        return encryptionRepositoryDAO;
    }

    public PasswordRepositoryDAO getPasswordDAOInstance() {
        return passwordRepositoryDAO;
    }

    public DataTypeRepositoryDAO getDataTypeDAOInstance() {
        return dataTypeRepositoryDAO;
    }

    public DataTypeKeyDataRepositoryDAO getDataTypeKeyDataDAOInstance() {
        return dataTypeKeyDataRepositoryDAO;
    }
}
