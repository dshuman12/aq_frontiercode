package com.gap.customer.vaultservice.dao.Impl;

import com.gap.customer.vaultservice.exception.VaultServiceException;
import com.gap.customer.vaultservice.models.Token;
import com.gap.customer.vaultservice.repository.azureSql.TokenRepository;
import com.gap.customer.vaultservice.config.ResilientTimeLimitterConfig;
import com.gap.gid.security.dto.BluefinTokenDTO;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.springframework.test.context.junit.jupiter.SpringExtension;

import java.util.Date;
import java.util.concurrent.TimeoutException;

import static com.gap.customer.vaultservice.util.TimelimterUtils.getAzureTimeLimiter;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(SpringExtension.class)
class TokenRepositoryDAOImplTest {

    private final String VAULT_ID = "0A3C98B7FEE1D56CB991E3E18D6D6170";
    private final String VOLTAGE_TOKEN = "6018596782192368";
    private final String BLUEFIN_TOKEN = "4485861361361655";
    private final String BLUEFIN_ID = "djI6MTIwMjIwMjE2MTM0NDMxMTAxMjI5Nzg2NXxiYzVkMDU3YjUwMzkyMDA3N2JkZjBiZmE3ODVhYWU2Znx8fA==";
    private final String VOLTAGE_TOKEN_FORMAT = "firstsixlastfour";
    private final String USER_ID = "TEST_USER";
    private final Date DATE_TIME = new Date();

    @InjectMocks
    private TokenRepositoryDAOImpl tokenRepositoryDAO;

    @Mock
    private TokenRepository tokenRepository;

    @Mock
    private ResilientTimeLimitterConfig resilientTimeLimitterConfig;

    @Test
    void shouldFindByVoltageToken() throws VaultServiceException, TimeoutException {
        Token token = getToken();
        when(tokenRepository.findByVoltageToken(VOLTAGE_TOKEN)).thenReturn(token);
        when(resilientTimeLimitterConfig.getAzureDbTimeLimiter()).thenReturn(getAzureTimeLimiter());

        Token actualToken = tokenRepositoryDAO.findByVoltageToken(VOLTAGE_TOKEN);

        assertEquals(token, actualToken);
    }

    @Test
    void shouldFindByVoltageTokenWithoutBluefinToken() throws VaultServiceException, TimeoutException {
        Token token = getTokenWithoutBluefin();
        when(tokenRepository.findByVoltageTokenWithoutBluefin(VOLTAGE_TOKEN)).thenReturn(token);
        when(resilientTimeLimitterConfig.getAzureDbTimeLimiter()).thenReturn(getAzureTimeLimiter());

        Token actualToken = tokenRepositoryDAO.findByVoltageTokenWithoutBluefin(VOLTAGE_TOKEN);

        assertEquals(token, actualToken);
    }

    @Test
    void shouldCreateToken() {
        doNothing().when(tokenRepository)
                .createToken(VAULT_ID, VOLTAGE_TOKEN_FORMAT, VOLTAGE_TOKEN, USER_ID, DATE_TIME, USER_ID,
                        DATE_TIME, BLUEFIN_TOKEN, BLUEFIN_ID);

        tokenRepositoryDAO.createToken(getToken());

        verify(tokenRepository, times(1)).createToken(VAULT_ID, VOLTAGE_TOKEN_FORMAT, VOLTAGE_TOKEN,
                USER_ID, DATE_TIME, USER_ID, DATE_TIME, BLUEFIN_TOKEN, BLUEFIN_ID);
    }

    @Test
    void shouldFindByVaultId() throws VaultServiceException, TimeoutException {
        Token token = getToken();
        when(tokenRepository.findByVaultId(VAULT_ID)).thenReturn(token);
        when(resilientTimeLimitterConfig.getAzureDbTimeLimiter()).thenReturn(getAzureTimeLimiter());

        Token actualToken = tokenRepositoryDAO.findByVaultId(VAULT_ID);

        assertEquals(token, actualToken);
    }

    @Test
    void shouldUpdateToken() {
        doNothing().when(tokenRepository).updateToken(VAULT_ID, BLUEFIN_TOKEN, BLUEFIN_ID, DATE_TIME, USER_ID);
        BluefinTokenDTO bluefinTokenDTO = BluefinTokenDTO.builder().token(BLUEFIN_TOKEN).bfid(BLUEFIN_ID).build();

        tokenRepositoryDAO.updateToken(VAULT_ID, bluefinTokenDTO, USER_ID);

        verify(tokenRepository, times(1)).updateToken(anyString(), anyString(), anyString(),
                any(Date.class), anyString());
    }

    @Test
    void shouldFindByBluefinToken() throws VaultServiceException, TimeoutException {
        Token token = getToken();
        when(tokenRepository.findByBluefinToken(BLUEFIN_TOKEN)).thenReturn(token);
        when(resilientTimeLimitterConfig.getAzureDbTimeLimiter()).thenReturn(getAzureTimeLimiter());

        Token actualToken = tokenRepositoryDAO.findByBluefinToken(BLUEFIN_TOKEN);

        assertEquals(token, actualToken);
    }

    @Test
    void shouldFindByVaultIdWithoutBluefin() throws VaultServiceException, TimeoutException {
        Token token = getTokenWithoutBluefin();
        when(tokenRepository.findByVaultIdWithoutBluefin(VAULT_ID)).thenReturn(token);
        when(resilientTimeLimitterConfig.getAzureDbTimeLimiter()).thenReturn(getAzureTimeLimiter());

        Token actualToken = tokenRepositoryDAO.findByVaultIdWithoutBluefin(VAULT_ID);

        assertEquals(token, actualToken);
    }

    @Test
    void shouldReturnTrueForConnectionCheck() throws VaultServiceException, TimeoutException {
        when(tokenRepository.isConnectionAlive()).thenReturn(true);
        when(resilientTimeLimitterConfig.getAzureDbTimeLimiter()).thenReturn(getAzureTimeLimiter());

        boolean isConnectionAlive = tokenRepositoryDAO.isConnectionAlive();

        assertTrue(isConnectionAlive);
    }

    private Token getToken() {
        return Token.builder()
                .vaultId(VAULT_ID)
                .voltageToken(VOLTAGE_TOKEN)
                .tokenFormatText(VOLTAGE_TOKEN_FORMAT)
                .bluefinToken(BLUEFIN_TOKEN)
                .bluefinId(BLUEFIN_ID)
                .createdByUserId(USER_ID)
                .lastUpdatedByUserId(USER_ID)
                .currentDateAndTime(DATE_TIME)
                .lastUpdatedDateAndTime(DATE_TIME)
                .build();
    }

    private Token getTokenWithoutBluefin() {
        return Token.builder()
                .vaultId(VAULT_ID)
                .voltageToken(VOLTAGE_TOKEN)
                .tokenFormatText(VOLTAGE_TOKEN_FORMAT)
                .createdByUserId(USER_ID)
                .lastUpdatedByUserId(USER_ID)
                .currentDateAndTime(DATE_TIME)
                .lastUpdatedDateAndTime(DATE_TIME)
                .build();
    }
}