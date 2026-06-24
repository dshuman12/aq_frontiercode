package com.gap.customer.vaultservice.scheduler;

import com.gap.customer.vaultservice.dto.LookUpDataDTO;
import com.gap.customer.vaultservice.models.VaultFeatureToggle;
import com.gap.customer.vaultservice.services.LookUpService;
import com.gap.gid.config.RestTemplateConfig;
import lombok.Generated;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.config.ConfigurableBeanFactory;
import org.springframework.context.annotation.Scope;
import org.springframework.scheduling.annotation.Scheduled;

import javax.annotation.PostConstruct;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Scope(ConfigurableBeanFactory.SCOPE_SINGLETON)
@RequiredArgsConstructor
@Generated
public class LookUpScheduler {
    
    private final LookUpService lookUpService;
    private final VaultFeatureToggle vaultFeatureToggle;
    private final RestTemplateConfig restTemplateConfig;

    @PostConstruct
    public void postConstruct() {
        try {
            setLookUpData();
        } catch (Exception exception) {
            log.error("Error while setting lookup data. ", exception);
            vaultFeatureToggle.setDefaults();
        }
    }

    public void setLookUpData() {
        List<LookUpDataDTO> lookUpDataDTOResponse = lookUpService.getLookUpData();
        vaultFeatureToggle.updateLookupMap(lookUpDataDTOResponse);
        if (log.isDebugEnabled()) {
            log.info("Updated lookUp flags");
        }
        updateBlufinTimeout();
    }

    @Scheduled(fixedDelayString = "${vault.service.pollingTime}")
    public void fetchLookUpData() {
        setLookUpData();
    }

    private void updateBlufinTimeout() {
        restTemplateConfig.updateBlufinTimeout(vaultFeatureToggle.getTokenizeTimeout(),
                vaultFeatureToggle.getBulkTokenizeTimeout(),
                vaultFeatureToggle.getDetokenizeTimeout(),
                vaultFeatureToggle.getBulkDetokenizeTimeout(),
                vaultFeatureToggle.getBFConnectTimeout(),
                vaultFeatureToggle.getBFConPoolTimeout());
    }
}