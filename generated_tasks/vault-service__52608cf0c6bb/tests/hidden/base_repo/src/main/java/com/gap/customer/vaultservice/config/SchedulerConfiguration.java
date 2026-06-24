package com.gap.customer.vaultservice.config;

import com.gap.customer.vaultservice.models.VaultFeatureToggle;
import com.gap.customer.vaultservice.scheduler.LookUpScheduler;
import com.gap.customer.vaultservice.services.LookUpService;
import com.gap.gid.config.RestTemplateConfig;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SchedulerConfiguration {

    @Bean
    public LookUpScheduler lookUpScheduler(LookUpService lookUpService, VaultFeatureToggle vaultFeatureToggle, RestTemplateConfig restTemplateConfig) {
        return new LookUpScheduler(lookUpService, vaultFeatureToggle, restTemplateConfig);
    }
}
