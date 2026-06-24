package com.gap.customer.vaultservice.actuator;

import com.gap.customer.vaultservice.dao.DAOFacade;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.actuate.health.AbstractHealthIndicator;
import org.springframework.boot.actuate.health.Health;
import org.springframework.stereotype.Component;

import static org.springframework.boot.actuate.health.Status.DOWN;
import static org.springframework.boot.actuate.health.Status.UP;

@Slf4j
@Component
@RequiredArgsConstructor
public class VaultHealthIndicator extends AbstractHealthIndicator {

    private final DAOFacade daoFacade;

    @Override
    protected void doHealthCheck(Health.Builder builder) {
        boolean checkDBConnectivity = checkDBConnectivity();
        builder.status(checkDBConnectivity ? UP : DOWN)
                .withDetail("databaseConnection", (checkDBConnectivity ? UP : DOWN));
    }

    private boolean checkDBConnectivity() {
        try {
            return daoFacade.getTokenDAOInstance().isConnectionAlive();
        } catch (Exception e) {
            log.error("VaultHealthIndicator:: Error occured while calling DB for connection check. " + e);
            return false;
        }
    }
}