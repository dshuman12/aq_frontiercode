package com.gap.customer.vaultservice.exception;

import com.gap.customer.vaultservice.error.ErrorEntityInternal;

public class LegacyVaultServiceException extends VaultServiceException {

	public LegacyVaultServiceException() {
		super();
	}

	public LegacyVaultServiceException(String message, Throwable cause) {
		super(message, cause);
	}

	public LegacyVaultServiceException(String message) {
		super(message);
	}

	public LegacyVaultServiceException(Throwable cause) {
		super(cause);
	}

	public LegacyVaultServiceException(ErrorEntityInternal errorEntityInternal) {
		this.errorEntityInternal = errorEntityInternal;
	}

	public LegacyVaultServiceException(ErrorEntityInternal errorEntityInternal, Throwable cause) {
		super(cause);
		this.errorEntityInternal = errorEntityInternal;
	}
}