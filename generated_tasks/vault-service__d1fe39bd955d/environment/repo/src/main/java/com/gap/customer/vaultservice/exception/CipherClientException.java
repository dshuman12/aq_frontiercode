package com.gap.customer.vaultservice.exception;

import com.gap.customer.vaultservice.error.ErrorEntityInternal;

public class CipherClientException extends VaultServiceException {

	protected ErrorEntityInternal errorEntityInternal;

	public CipherClientException(String message, Throwable cause) {
		super(message, cause);
	}

	public CipherClientException(String message) {
		super(message);
	}

	public ErrorEntityInternal getErrorEntityInternal() {
		return errorEntityInternal;
	}

	public void setErrorEntityInternal(ErrorEntityInternal errorEntityInternal) {
		this.errorEntityInternal = errorEntityInternal;
	}

}