package com.gap.customer.vaultservice.dao.Impl;

import com.gap.customer.vaultservice.dao.PasswordRepositoryDAO;
import com.gap.customer.vaultservice.dto.PasswordResultDTO;
import com.gap.customer.vaultservice.error.ErrorCodes;
import com.gap.customer.vaultservice.exception.VaultServiceException;
import com.gap.customer.vaultservice.repository.azureSql.PasswordRepository;
import com.gap.customer.vaultservice.config.ResilientTimeLimitterConfig;
import io.github.resilience4j.retry.RetryRegistry;
import io.github.resilience4j.retry.annotation.Retry;
import io.github.resilience4j.timelimiter.TimeLimiter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Component;

import javax.annotation.PostConstruct;
import java.math.BigDecimal;
import java.util.Date;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeoutException;

import static com.gap.customer.vaultservice.config.ResilientTimeLimitterConfig.DB_RETRY_AZURE;

@Slf4j
@RequiredArgsConstructor
@Component
public class PasswordRepositoryDAOImpl implements PasswordRepositoryDAO {
    private final PasswordRepository passwordRepository;

    private final ResilientTimeLimitterConfig resilientTimeLimitterConfig;

    private final RetryRegistry registry;

    private static final int SQL_TIMEOUT_TIMER = 700;

    @Override
    @Retry(name = DB_RETRY_AZURE)
    public PasswordResultDTO getByDataTypeAndHashValue(String hashValue, String dataType) throws TimeoutException, VaultServiceException {
        Long startTime = System.currentTimeMillis();
        try {
            return TimeLimiter.decorateFutureSupplier(resilientTimeLimitterConfig.getAzureDbTimeLimiter(), () ->
                    CompletableFuture.supplyAsync(() -> passwordRepository.getByDataTypeAndHashValue(hashValue, dataType))
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
                log.info("Time taken for DB Call getByDataTypeAndHashValue : " +totalTime + " with thread id: "+Thread.currentThread().getId());
            }
        }
    }

    @Override
    @Retry(name = DB_RETRY_AZURE)
    public PasswordResultDTO getByVaultId(String vaultId) throws TimeoutException, VaultServiceException {
        Long startTime = System.currentTimeMillis();
        try {
            return TimeLimiter.decorateFutureSupplier(resilientTimeLimitterConfig.getAzureDbTimeLimiter(), () ->
                    CompletableFuture.supplyAsync(() -> passwordRepository.getByVaultId(vaultId))
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
                log.info("Time taken for DB Call getByVaultId : " +totalTime + " with thread id: "+Thread.currentThread().getId());
            }
        }
    }

    @Override
    public boolean insert(String vaultId, byte[] cipherText, String hashValueForClearText, BigDecimal encryptedKeyId, String appName) {
        Long startTime = System.currentTimeMillis();
        boolean isInserted= false;
        try {
            isInserted = passwordRepository.insert(
                    vaultId,
                    cipherText,
                    hashValueForClearText,
                    encryptedKeyId,
                    StringUtils.isBlank(appName) ? "UNAUTHENTICATED" : appName,
                    new Date(),
                    StringUtils.isBlank(appName) ? "UNAUTHENTICATED" : appName,
                    new Date());
        } finally {
            Long endTime = System.currentTimeMillis();
            Long totalTime = endTime - startTime;
            if(totalTime > SQL_TIMEOUT_TIMER) {
                log.info("Time taken for DB Call of Password Repository insert : " +totalTime + " with thread id: "+Thread.currentThread().getId());
            }
            return isInserted;
        }
    }

    @PostConstruct
    public void postConstruct() {
        registry.retry(DB_RETRY_AZURE)
                .getEventPublisher()
                .onRetry(event -> log.info(event.toString()));
    }
}
