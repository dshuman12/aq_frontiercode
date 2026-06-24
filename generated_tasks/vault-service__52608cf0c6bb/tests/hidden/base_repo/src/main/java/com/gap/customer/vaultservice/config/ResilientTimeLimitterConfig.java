package com.gap.customer.vaultservice.config;

import com.gap.customer.vaultservice.models.VaultFeatureToggle;
import io.github.resilience4j.timelimiter.TimeLimiter;
import io.github.resilience4j.timelimiter.TimeLimiterRegistry;
import io.github.resilience4j.timelimiter.TimeLimiterConfig;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Duration;

@Component
@RequiredArgsConstructor
public class ResilientTimeLimitterConfig {

    private final VaultFeatureToggle vaultFeatureToggle;

    public static final String DB_RETRY_AZURE = "db-retry-azure";

    public TimeLimiter getAzureDbTimeLimiter() {
        TimeLimiterConfig config = TimeLimiterConfig.custom().cancelRunningFuture(true).timeoutDuration(Duration.ofMillis(vaultFeatureToggle.getAzureDBTimeout())).build();
        TimeLimiterRegistry registry = TimeLimiterRegistry.of(config);
        return registry.timeLimiter("azureDbTimeLimiter");
    }

}
