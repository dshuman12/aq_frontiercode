package com.gap.customer.vaultservice.util;

import io.github.resilience4j.timelimiter.TimeLimiter;
import io.github.resilience4j.timelimiter.TimeLimiterConfig;
import io.github.resilience4j.timelimiter.TimeLimiterRegistry;

import java.time.Duration;

public class TimelimterUtils {

    public static TimeLimiter getAzureTimeLimiter() {
        TimeLimiterConfig config = TimeLimiterConfig.custom().cancelRunningFuture(true).timeoutDuration(Duration.ofMillis(20)).build();
        TimeLimiterRegistry registry = TimeLimiterRegistry.of(config);
        return registry.timeLimiter("azureDbTimeLimiter");
    }
}
