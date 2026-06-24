package com.gap.customer.vaultservice.controller;

public class TraceHeaders {
    private TraceHeaders() {
    }

    public static final String X_FORWARDED_FOR = "X-Forwarded-For";
    public static final String X_GID_CLIENT_SESSION = "X-Gid-Client-Session";
    public static final String X_APP_NAME = "X-App-Name";
    public static final String X_PREVIEW_HEADER = "isPreviewRequest";
}
