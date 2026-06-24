package com.gap.customer.vaultservice.exception;

import com.gap.customer.vaultservice.error.ErrorEntityInternal;
import lombok.Getter;

@Getter
public class VaultServiceException extends Exception {

	protected ErrorEntityInternal errorEntityInternal;

	public VaultServiceException() {
		super();
	}

	public VaultServiceException(String message, Throwable cause) {
		super(message, cause);
	}

	public VaultServiceException(String message) {
		super(message);
	}

	public VaultServiceException(Throwable cause) {
		super(cause);
	}

	public VaultServiceException(ErrorEntityInternal errorEntityInternal, Throwable cause) {
		super(cause);
		this.errorEntityInternal = errorEntityInternal;
	}

	public VaultServiceException(ErrorEntityInternal errorEntityInternal) {
		this.errorEntityInternal = errorEntityInternal;
	}

	public ErrorEntityInternal getErrorEntityInternal() {
		return errorEntityInternal;
	}

	public void setErrorEntityInternal(ErrorEntityInternal errorEntityInternal) {
		this.errorEntityInternal = errorEntityInternal;
	}

}