package com.gap.customer.vaultservice.security;

import com.ingrian.internal.ilc.IngrianLogService;
import lombok.extern.slf4j.Slf4j;

@Slf4j
public class CipherLogger implements  IngrianLogService {
    @Override
    public boolean isDebugEnabled() {
        return false;
    }

    @Override
    public boolean isErrorEnabled() {
        return false;
    }

    @Override
    public boolean isInfoEnabled() {
        return false;
    }

    @Override
    public boolean isTraceEnabled() {
        return false;
    }

    @Override
    public boolean isWarnEnabled() {
        return false;
    }

    @Override
    public void info(String message) {
        log.info(message);
    }

    @Override
    public void trace(String message) {
       log.trace(message);
    }

    @Override
    public void debug(String message) {
        log.debug(message);
    }

    @Override
    public void debug(String message, Throwable t) {
        log.debug(message, t);
    }

    @Override
    public void error(String message) {
         log.error(message);
    }

    @Override
    public void error(String message, Throwable t) {
        log.error(message, t);
    }

    @Override
    public void warn(String message) {
        log.warn(message);
    }

    @Override
    public void warn(String message, Throwable t) {
      log.warn(message, t);
    }
}
