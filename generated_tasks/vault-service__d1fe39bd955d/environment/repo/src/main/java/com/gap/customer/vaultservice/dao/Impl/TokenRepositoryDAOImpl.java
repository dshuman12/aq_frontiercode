package com.gap.customer.vaultservice.dao.Impl;

import com.gap.customer.vaultservice.dao.TokenRepositoryDAO;
import com.gap.customer.vaultservice.error.ErrorCodes;
import com.gap.customer.vaultservice.exception.VaultServiceException;
import com.gap.customer.vaultservice.models.Token;
import com.gap.customer.vaultservice.repository.azureSql.TokenRepository;
import com.gap.customer.vaultservice.config.ResilientTimeLimitterConfig;
import com.gap.customer.vaultservice.util.VaultConstants;
import com.gap.gid.security.dto.BluefinTokenDTO;
import io.github.resilience4j.retry.RetryRegistry;
import io.github.resilience4j.retry.annotation.Retry;
import io.github.resilience4j.timelimiter.TimeLimiter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Component;

import javax.annotation.PostConstruct;
import java.util.Date;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeoutException;

import static com.gap.customer.vaultservice.config.ResilientTimeLimitterConfig.DB_RETRY_AZURE;

@Slf4j
@Component
@RequiredArgsConstructor
public class TokenRepositoryDAOImpl implements TokenRepositoryDAO {

    private final TokenRepository tokenRepository;

    private final ResilientTimeLimitterConfig resilientTimeLimitterConfig;

    private final RetryRegistry registry;

    private static final int SQL_TIMEOUT_TIMER = 700;

    @Override
    @Retry(name = DB_RETRY_AZURE)
    public Token findByVoltageToken(String voltageToken) throws TimeoutException, VaultServiceException {
        Long startTime = System.currentTimeMillis();
        try {
            return TimeLimiter.decorateFutureSupplier(resilientTimeLimitterConfig.getAzureDbTimeLimiter(), () ->
                    CompletableFuture.supplyAsync(() -> tokenRepository.findByVoltageToken(voltageToken))
            ).call();
        } catch (TimeoutException timeoutException) {
            throw timeoutException;
        } catch (Exception exception) {
            throw new VaultServiceException(ErrorCodes.INTERNAL_SERVER_ERROR, exception);
        }
        finally {
            Long endTime = System.currentTimeMillis();
            Long totalTime = endTime - startTime;
            if(totalTime > SQL_TIMEOUT_TIMER) {
                log.info("Time taken for DB Call findByVoltageToken : " +totalTime + " with thread id: "+Thread.currentThread().getId());
            }
        }
    }

    @Override
    @Retry(name = DB_RETRY_AZURE)
    public Token findByVoltageTokenWithoutBluefin(String voltageToken) throws TimeoutException, VaultServiceException {
        Long startTime = System.currentTimeMillis();
        try {
            return TimeLimiter.decorateFutureSupplier(resilientTimeLimitterConfig.getAzureDbTimeLimiter(), () ->
                    CompletableFuture.supplyAsync(() -> tokenRepository.findByVoltageTokenWithoutBluefin(voltageToken))
            ).call();
        } catch (TimeoutException timeoutException) {
            throw timeoutException;
        } catch (Exception exception) {
            throw new VaultServiceException(ErrorCodes.INTERNAL_SERVER_ERROR, exception);
        }
        finally {
            Long endTime = System.currentTimeMillis();
            Long totalTime = endTime - startTime;
            if(totalTime > SQL_TIMEOUT_TIMER) {
                log.info("Time taken for DB Call findByVoltageTokenWithoutBluefin : " +totalTime + " with thread id: "+Thread.currentThread().getId());
            }
        }
    }

    @Override
    public void createToken(Token token) {
        Long startTime = System.currentTimeMillis();
        try {
            tokenRepository.createToken(token.getVaultId()
                    , token.getTokenFormatText(), token.getVoltageToken(),
                    token.getCreatedByUserId(),
                    token.getCurrentDateAndTime(),
                    token.getLastUpdatedByUserId(),
                    token.getLastUpdatedDateAndTime(),
                    token.getBluefinToken(),
                    token.getBluefinId());
        } finally {
            Long endTime = System.currentTimeMillis();
            Long totalTime = endTime - startTime;
            if(totalTime > SQL_TIMEOUT_TIMER) {
                log.info("Time taken for DB Call createToken: " +totalTime + " with thread id: "+Thread.currentThread().getId());
            }
        }
    }

    @Override
    @Retry(name = DB_RETRY_AZURE)
    public Token findByVaultId(String vaultID) throws TimeoutException, VaultServiceException {
        Long startTime = System.currentTimeMillis();
        try {
            return TimeLimiter.decorateFutureSupplier(resilientTimeLimitterConfig.getAzureDbTimeLimiter(), () ->
                    CompletableFuture.supplyAsync(() -> tokenRepository.findByVaultId(vaultID))
            ).call();
        } catch (TimeoutException timeoutException) {
            throw timeoutException;
        } catch (Exception exception) {
            throw new VaultServiceException(ErrorCodes.INTERNAL_SERVER_ERROR, exception);
        }
        finally {
            Long endTime = System.currentTimeMillis();
            Long totalTime = endTime - startTime;
            if(totalTime > SQL_TIMEOUT_TIMER) {
                log.info("Time taken for DB Call findByVaultId : " +totalTime + " with thread id: "+Thread.currentThread().getId());
            }
        }
    }

    @Override
    public void updateToken(String vaultId, BluefinTokenDTO bluefinTokenDTOForCard, String appName) {
        Long startTime = System.currentTimeMillis();
        try {
            tokenRepository.updateToken(vaultId,
                    bluefinTokenDTOForCard.getToken(),
                    bluefinTokenDTOForCard.getBfid(),
                    new Date(),
                    StringUtils.isBlank(appName) ? VaultConstants.UNAUTHENTICATED : appName);
        } finally {
            Long endTime = System.currentTimeMillis();
            Long totalTime = endTime - startTime;
            if(totalTime > SQL_TIMEOUT_TIMER) {
                log.info("Time taken for DB Call updateToken : " +totalTime + " with thread id: "+Thread.currentThread().getId());
            }
        }
    }

    @Override
    @Retry(name = DB_RETRY_AZURE)
    public Token findByBluefinToken(String bluefinToken) throws TimeoutException, VaultServiceException {
        Long startTime = System.currentTimeMillis();
        try {
            return TimeLimiter.decorateFutureSupplier(resilientTimeLimitterConfig.getAzureDbTimeLimiter(), () ->
                    CompletableFuture.supplyAsync(() -> tokenRepository.findByBluefinToken(bluefinToken))
            ).call();
        } catch (TimeoutException timeoutException) {
            throw timeoutException;
        } catch (Exception exception) {
            throw new VaultServiceException(ErrorCodes.INTERNAL_SERVER_ERROR, exception);
        }
        finally {
            Long endTime = System.currentTimeMillis();
            Long totalTime = endTime - startTime;
            if(totalTime > SQL_TIMEOUT_TIMER) {
                log.info("Time taken for DB Call findByBluefinToken : " +totalTime + " with thread id: "+Thread.currentThread().getId());
            }
        }
    }

    @Override
    @Retry(name = DB_RETRY_AZURE)
    public Token findByVaultIdWithoutBluefin(String vaultId) throws TimeoutException, VaultServiceException {
        Long startTime = System.currentTimeMillis();
        try {
            return TimeLimiter.decorateFutureSupplier(resilientTimeLimitterConfig.getAzureDbTimeLimiter(), () ->
                    CompletableFuture.supplyAsync(() -> tokenRepository.findByVaultIdWithoutBluefin(vaultId))
            ).call();
        } catch (TimeoutException timeoutException) {
            throw timeoutException;
        } catch (Exception exception) {
            throw new VaultServiceException(ErrorCodes.INTERNAL_SERVER_ERROR, exception);
        }
        finally {
            Long endTime = System.currentTimeMillis();
            Long totalTime = endTime - startTime;
            if(totalTime > SQL_TIMEOUT_TIMER) {
                log.info("Time taken for DB Call findByVaultIdWithoutBluefin : " +totalTime + " with thread id: "+Thread.currentThread().getId());
            }
        }
    }

    @Override
    @Retry(name = DB_RETRY_AZURE)
    public boolean isConnectionAlive() throws TimeoutException, VaultServiceException {
        Long startTime = System.currentTimeMillis();
        try {
            return TimeLimiter.decorateFutureSupplier(resilientTimeLimitterConfig.getAzureDbTimeLimiter(), () ->
                    CompletableFuture.supplyAsync(() -> tokenRepository.isConnectionAlive())
            ).call();
        } catch (TimeoutException timeoutException) {
            throw timeoutException;
        } catch (Exception exception) {
            throw new VaultServiceException(ErrorCodes.INTERNAL_SERVER_ERROR, exception);
        }
        finally {
            Long endTime = System.currentTimeMillis();
            Long totalTime = endTime - startTime;
            if(totalTime > SQL_TIMEOUT_TIMER) {
                log.info("Time taken for DB Call isConnectionAlive : " +totalTime + " with thread id: "+Thread.currentThread().getId());
            }
        }
    }

    @PostConstruct
    public void postConstruct() {
        registry.retry(DB_RETRY_AZURE)
                .getEventPublisher()
                .onRetry(event -> log.info(event.toString()));
    }

}
