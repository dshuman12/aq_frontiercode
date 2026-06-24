package com.gap.gid.security.exception;

public class BluefinException extends Exception {

    public BluefinException(Exception e) {
        super(e);
    }

    public BluefinException(String message) {
        super(message);
    }

    public BluefinException(String message, Exception e) {
        super(message, e);
    }
}
