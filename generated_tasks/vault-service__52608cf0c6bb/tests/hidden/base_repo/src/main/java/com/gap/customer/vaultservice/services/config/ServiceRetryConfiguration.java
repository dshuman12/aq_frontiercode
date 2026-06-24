package com.gap.customer.vaultservice.services.config;

import org.springframework.retry.backoff.FixedBackOffPolicy;
import org.springframework.retry.policy.SimpleRetryPolicy;
import org.springframework.retry.support.RetryTemplate;

public class ServiceRetryConfiguration {

    private int retries;
    private int waitInMillis;

    public void setRetries(int retries) {
        this.retries = retries;
    }

    public void setWaitInMillis(int waitInMillis) {
        this.waitInMillis = waitInMillis;
    }

    public int getRetries() {
        return retries;
    }

    public int getWaitInMillis() {
        return waitInMillis;
    }

    public RetryTemplate getRetryTemplate() {
        RetryTemplate template = new RetryTemplate();
        FixedBackOffPolicy backOffPolicy = new FixedBackOffPolicy();
        backOffPolicy.setBackOffPeriod(getWaitInMillis());
        SimpleRetryPolicy retryPolicy = new SimpleRetryPolicy();
        retryPolicy.setMaxAttempts(getRetries());
        template.setBackOffPolicy(backOffPolicy);
        template.setRetryPolicy(retryPolicy);
        return template;
    }
}