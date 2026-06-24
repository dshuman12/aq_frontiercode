package com.gap.customer.vaultservice.exception;

import com.gap.customer.vaultservice.error.ErrorEntityInternal;
import lombok.Getter;

@Getter
public class DataNotFoundException extends VaultServiceException {

    private String devMessage;

    public DataNotFoundException() {
        super();
    }

    public DataNotFoundException(String message, Throwable cause) {
        super(message, cause);
    }

    public DataNotFoundException(String message, String devMessage) {
        super(message);
        setDevMessage(devMessage);
    }

    public DataNotFoundException(String message) {
        super(message);
    }

    public DataNotFoundException(Throwable cause) {
        super(cause);
    }

    public DataNotFoundException(ErrorEntityInternal errorEntityInternal) {
        super(errorEntityInternal);
    }

    private void setDevMessage(String devMessage) {
        this.devMessage = devMessage;
    }
}
