package com.gap.customer.vaultservice.exception;

import com.gap.customer.vaultservice.error.ErrorEntityInternal;
import lombok.Getter;

@Getter
public class ValidationException extends VaultServiceException {

	private Integer index;

	public ValidationException() {
		super();
	}

	public ValidationException(String message, Throwable cause) {
		super(message, cause);
	}

	public ValidationException(String message) {
		super(message);
	}

	public ValidationException(String message, Integer index) {
		super(message);
		setIndex(index);
	}

	public ValidationException(Throwable cause) {
		super(cause);
	}

	public ValidationException(ErrorEntityInternal errorEntityInternal) {
		super(errorEntityInternal);
	}

	public ValidationException(ErrorEntityInternal errorEntityInternal, Integer index) {
		super(errorEntityInternal);
		setIndex(index);
	}

	private void setIndex(Integer index) {
		this.index = index;
	}
}
