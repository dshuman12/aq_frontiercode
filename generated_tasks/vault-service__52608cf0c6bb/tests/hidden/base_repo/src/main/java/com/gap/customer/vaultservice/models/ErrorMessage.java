package com.gap.customer.vaultservice.models;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Data;

@JsonIgnoreProperties(ignoreUnknown = true)
@Data
@AllArgsConstructor
public class ErrorMessage {

    private final int code;
    private final String message;
    private final String developerMessage;

    @Override
    public String toString() {
        return "ErrorMessage{" + "code=" + code + ", message=" + message + ", " +
                "developerMessage=" + developerMessage + '}';
    }


}
