package com.gap.gid.security.exception;

public class BluefinTimeoutException extends Exception{

    public BluefinTimeoutException(Exception e) {
        super(e);
    }

    public BluefinTimeoutException(String message, Exception e) {
        super(message, e);
    }
}
