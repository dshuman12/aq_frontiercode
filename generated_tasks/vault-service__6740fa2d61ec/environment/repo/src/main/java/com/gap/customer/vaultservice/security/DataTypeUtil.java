package com.gap.customer.vaultservice.security;

import com.gap.customer.vaultservice.dao.DAOFacade;
import com.gap.customer.vaultservice.error.ErrorCodes;
import com.gap.customer.vaultservice.exception.VaultServiceException;
import com.gap.customer.vaultservice.models.VaultFeatureToggle;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.concurrent.TimeoutException;

@Component
@RequiredArgsConstructor
public class DataTypeUtil {

    private final DAOFacade daoFacade;

    public  List DataTypeList() throws VaultServiceException {
        try {
            return daoFacade.getDataTypeDAOInstance().dataTypeGetAll();
        } catch (TimeoutException timeoutException) {
            throw new VaultServiceException(ErrorCodes.DB_TIMEOUT_ERROR, timeoutException);
        }
    }

}
