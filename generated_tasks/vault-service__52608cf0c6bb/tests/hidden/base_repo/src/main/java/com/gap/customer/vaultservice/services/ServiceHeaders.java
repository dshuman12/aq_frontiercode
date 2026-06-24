package com.gap.customer.vaultservice.services;

import com.gap.customer.vaultservice.controller.TraceHeaders;
import com.gap.customer.vaultservice.error.*;
import com.gap.customer.vaultservice.exception.ValidationException;
import com.gap.customer.vaultservice.util.VaultConstants;
import org.springframework.http.HttpHeaders;

import javax.servlet.http.HttpServletRequest;
import java.util.*;


public interface ServiceHeaders {

    default Map<String, String> getHeadersFromRequest(HttpServletRequest request) {


        Map<String, String> headers = new HashMap<>();
        if (request.getRemoteAddr() != null) {
            headers.put(TraceHeaders.X_FORWARDED_FOR, request.getRemoteAddr());
        }
        if (request.getHeader(TraceHeaders.X_GID_CLIENT_SESSION) != null) {
            headers.put(TraceHeaders.X_GID_CLIENT_SESSION, request.getHeader(TraceHeaders.X_GID_CLIENT_SESSION));
        }
        if (request.getHeader(TraceHeaders.X_APP_NAME) != null) {
            headers.put(TraceHeaders.X_APP_NAME, request.getHeader(TraceHeaders.X_APP_NAME));
        }
        if (request.getHeader(TraceHeaders.X_PREVIEW_HEADER) != null) {
            headers.put(TraceHeaders.X_PREVIEW_HEADER, request.getHeader(TraceHeaders.X_PREVIEW_HEADER));
        }

        return headers;
    }

    default Map<String, String> getDataScopeHeaders(HttpServletRequest request) throws ValidationException {

        Map<String, String> dataScopeMap = new HashMap<String, String>();

        Enumeration vaultRequestHeaders = request.getHeaderNames();
        while (vaultRequestHeaders.hasMoreElements()) {
            String key = (String) vaultRequestHeaders.nextElement();
            if (key.equalsIgnoreCase(VaultConstants.DATA_SCOPE_HEADER)) {
                String value = request.getHeader(key);
                dataScopeMap.put(key, value);
                break;
            }
        }

        if (!dataScopeMap.containsKey(VaultConstants.DATA_SCOPE_HEADER)) {
            throw new ValidationException(ErrorEntityCodes.INVALID_REQUEST);
        }

        return dataScopeMap;
    }

    default HttpHeaders setResponseHeaders() {
        HttpHeaders responseHeaders = new HttpHeaders();
        responseHeaders.set("Strict-Transport-Security", "max-age=31536000;includeSubDomains");
        responseHeaders.set("Cache-Control", "no-store");
        responseHeaders.set("Pragma", "no-cache");
        responseHeaders.set("X-Frame-Options", "DENY");
        return responseHeaders;
    }


}

