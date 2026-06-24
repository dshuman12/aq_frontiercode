package com.gap.customer.vaultservice.services.config;

import org.springframework.boot.actuate.health.AbstractHealthIndicator;
import org.springframework.boot.actuate.health.Health;

import javax.ws.rs.client.WebTarget;

public class WebTargetHealthIndicator extends AbstractHealthIndicator {

    private final WebTarget target;

    public WebTargetHealthIndicator(WebTarget target) {
        super();
        this.target = target;
    }

    @Override
    protected void doHealthCheck(Health.Builder builder) throws Exception {
        target.request().get().close();

        builder.up();
    }
}
