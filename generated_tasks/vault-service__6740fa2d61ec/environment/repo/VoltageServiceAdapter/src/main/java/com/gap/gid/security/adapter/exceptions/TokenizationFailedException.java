package com.gap.gid.security.adapter.exceptions;

public class TokenizationFailedException extends RuntimeException {

    /**
     * Default serial id for the TokenizationFailedException
     */
    private static final long serialVersionUID = 1642060252767892820L;

    public TokenizationFailedException(String message, Exception ex) {
        super(message, ex);
    }

    public TokenizationFailedException(String message) {
        super(message);
    }
}

