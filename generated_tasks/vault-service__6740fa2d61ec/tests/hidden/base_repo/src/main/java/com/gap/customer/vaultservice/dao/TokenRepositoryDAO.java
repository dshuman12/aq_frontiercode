package com.gap.customer.vaultservice.dao;

import com.gap.customer.vaultservice.exception.VaultServiceException;
import com.gap.customer.vaultservice.models.Token;
import com.gap.gid.security.dto.BluefinTokenDTO;

import java.util.concurrent.TimeoutException;

public interface TokenRepositoryDAO {
    Token findByVoltageToken(String voltageToken) throws TimeoutException, VaultServiceException;

    Token findByVoltageTokenWithoutBluefin(String voltageToken) throws TimeoutException, VaultServiceException;

    void createToken(Token token);

    Token findByVaultId(String vaultID) throws TimeoutException, VaultServiceException;

    void updateToken(String vaultId, BluefinTokenDTO bluefinTokenDTOForCard, String appName);

    Token findByBluefinToken(String bluefinToken) throws TimeoutException, VaultServiceException;

    Token findByVaultIdWithoutBluefin(String vaultId) throws TimeoutException, VaultServiceException;

    boolean isConnectionAlive() throws TimeoutException, VaultServiceException;
}
