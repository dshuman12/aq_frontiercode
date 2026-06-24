package com.gap.customer.vaultservice.exception;

import com.gap.customer.vaultservice.error.ErrorCodes;
import com.gap.customer.vaultservice.error.ErrorEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

@RestControllerAdvice
public class RestExceptionHandler extends ResponseEntityExceptionHandler {
    @Override
    protected ResponseEntity<Object> handleHttpMessageNotReadable(HttpMessageNotReadableException ex, HttpHeaders headers, HttpStatus status, WebRequest request) {

        ErrorEntity e = new ErrorEntity();
        e.setDeveloperMessage("Malformed JSON request");
        e.setErrorCode(ErrorCodes.INVALID_JSON);
        e.setUserMessage("Error while parsing input request");
        return buildResponseEntity(e);
    }

    private ResponseEntity<Object> buildResponseEntity(ErrorEntity apiError) {
        return new ResponseEntity<>(apiError,HttpStatus.BAD_REQUEST);
    }


}
