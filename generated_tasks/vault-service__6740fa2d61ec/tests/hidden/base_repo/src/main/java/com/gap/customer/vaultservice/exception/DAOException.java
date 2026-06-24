package com.gap.customer.vaultservice.exception;

public class DAOException extends Exception {
    /**
     * DAOException Serial UID
     */
    private static final long serialVersionUID = 8607122749954646936L;

    /**
     * The default exception
     */
    public DAOException() {
        super();
    }

    /**
     * An exception with a message
     *
     * @param message The message
     */
    public DAOException(String message) {
        super(message);
    }

    /**
     * An exception with a message an a root cause
     *
     * @param message The message
     * @param ex      root cause
     */
    public DAOException(String message, Exception ex) {
        super(message, ex);
    }
}
