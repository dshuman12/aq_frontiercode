package com.gap.customer.vaultservice.dao.Impl;

import com.gap.customer.vaultservice.dao.EncryptionRepositoryDAO;
import com.gap.customer.vaultservice.dto.EncryptedDataResultDTO;
import com.gap.customer.vaultservice.error.ErrorCodes;
import com.gap.customer.vaultservice.exception.VaultServiceException;
import com.gap.customer.vaultservice.repository.azureSql.EncryptedDataRepository;
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
import static com.gap.customer.vaultservice.util.VaultConstants.SQL_TIMEOUT_TIMER;

@Slf4j
@Component
@RequiredArgsConstructor
public class EncryptionRepositoryDAOImpl implements EncryptionRepositoryDAO {

    private final EncryptedDataRepository encryptedDataRepository;

    private final ResilientTimeLimitterConfig resilientTimeLimitterConfig;

    private final RetryRegistry registry;

    @Override
    @Retry(name = DB_RETRY_AZURE)
    public EncryptedDataResultDTO getEncryptedDataByDataTypeAndHashValue(String hashValue, String dataType) throws VaultServiceException, TimeoutException {
        Long startTime = System.currentTimeMillis();
        try {
            return TimeLimiter.decorateFutureSupplier(resilientTimeLimitterConfig.getAzureDbTimeLimiter(), () ->
                    CompletableFuture.supplyAsync(() -> encryptedDataRepository.getEncryptedDataByDataTypeAndHashValue(hashValue, dataType))
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
                log.info("Time taken for DB Call getEncryptedDataByDataTypeAndHashValue : " +totalTime + " with thread id: "+Thread.currentThread().getId());
            }
        }
    }

    @Override
    @Retry(name = DB_RETRY_AZURE)
    public EncryptedDataResultDTO getEncryptedDataByVaultId(String vaultId) throws VaultServiceException, TimeoutException {
        Long startTime = System.currentTimeMillis();
        try {
            return TimeLimiter.decorateFutureSupplier(resilientTimeLimitterConfig.getAzureDbTimeLimiter(), () ->
                    CompletableFuture.supplyAsync(() -> encryptedDataRepository.getEncryptedDataByVaultId(vaultId))
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
                log.info("Time taken for DB Call getEncryptedDataByVaultId : " +totalTime + " with thread id: "+Thread.currentThread().getId());
            }
        }
    }

    @Override
    public void insertEncryptedData(String vaultId, byte[] cipherText, String hashValue, BigDecimal dataTypeKeyDataId, String appName) {
        Long startTime = System.currentTimeMillis();
        try {
            encryptedDataRepository.insertEncryptedData(vaultId,
                    cipherText,
                    hashValue,
                    dataTypeKeyDataId,
                    StringUtils.isBlank(appName) ? "UNAUTHENTICATED" : appName,
                    new Date(),
                    StringUtils.isBlank(appName) ? "UNAUTHENTICATED" : appName,
                    new Date()
            );
        } finally {
            Long endTime = System.currentTimeMillis();
            Long totalTime = endTime - startTime;
            if(totalTime > SQL_TIMEOUT_TIMER) {
                log.info("Time taken for DB Call insertEncryptedData : " +totalTime + " with thread id: "+Thread.currentThread().getId());
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
