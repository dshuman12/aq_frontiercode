package com.gap.customer.vaultservice.dao.Impl;

import com.gap.customer.vaultservice.config.ResilientTimeLimitterConfig;
import com.gap.customer.vaultservice.dao.DataTypeKeyDataRepositoryDAO;
import com.gap.customer.vaultservice.dto.DataTypeKeyDataResultDTO;
import com.gap.customer.vaultservice.error.ErrorCodes;
import com.gap.customer.vaultservice.exception.VaultServiceException;
import com.gap.customer.vaultservice.repository.azureSql.DataTypeKeyDataRepository;
import io.github.resilience4j.retry.RetryRegistry;
import io.github.resilience4j.retry.annotation.Retry;
import io.github.resilience4j.timelimiter.TimeLimiter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import javax.annotation.PostConstruct;
import java.util.Date;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeoutException;

import static com.gap.customer.vaultservice.config.ResilientTimeLimitterConfig.DB_RETRY_AZURE;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataTypeKeyDataRepositoryDAOImpl implements DataTypeKeyDataRepositoryDAO {

    private final DataTypeKeyDataRepository dataTypeKeyDataRepository;

    private final ResilientTimeLimitterConfig resilientTimeLimitterConfig;

    private final RetryRegistry registry;

    private static final int SQL_TIMEOUT_TIMER = 700;

    @Override
    public List<DataTypeKeyDataResultDTO> getDataTypeKeyDataGetByValidDateAndDataType(String dataType, Date currentDate, Date currentDateDup,Boolean isInitialized){
        return dataTypeKeyDataRepository.getDataTypeKeyDataGetByValidDateAndDataType(dataType, currentDate, currentDateDup);}

    @Override
    @Retry(name = DB_RETRY_AZURE)
    public List<DataTypeKeyDataResultDTO> getDataTypeKeyDataGetByValidDateAndDataType(String dataType, Date currentDate, Date currentDateDup) throws TimeoutException, VaultServiceException {
        Long startTime = System.currentTimeMillis();
        try {
            return TimeLimiter.decorateFutureSupplier(resilientTimeLimitterConfig.getAzureDbTimeLimiter(), () ->
                    CompletableFuture.supplyAsync(() -> dataTypeKeyDataRepository.getDataTypeKeyDataGetByValidDateAndDataType(dataType, currentDate, currentDateDup))
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
                log.info("Time taken for DB Call getDataTypeKeyDataGetByValidDateAndDataType : " +totalTime + " with thread id: "+Thread.currentThread().getId());
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
