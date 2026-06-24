package com.gap.customer.vaultservice.exception;

import com.gap.customer.vaultservice.error.ErrorEntity;
import com.gap.customer.vaultservice.error.ErrorEntityBuilder;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

import static com.gap.customer.vaultservice.error.ErrorEntityCodes.BLUEFIN_DETOKENIZE_EXECPTION;
import static com.gap.customer.vaultservice.error.ErrorEntityCodes.BLUEFIN_NOT_SUPPORTED;
import static com.gap.customer.vaultservice.error.ErrorEntityCodes.BLUEFIN_TOKENIZE_EXECPTION;
import static com.gap.customer.vaultservice.error.ErrorEntityCodes.BLUEFIN_TIMEOUT_EXECPTION;
import static com.gap.customer.vaultservice.error.ErrorEntityCodes.DATA_NOT_FOUND;
import static com.gap.customer.vaultservice.error.ErrorEntityCodes.INTERNAL_SERVER_ERROR;
import static com.gap.customer.vaultservice.error.ErrorEntityMessage.UNHANDLED_EXCEPTION_MESSAGE;

@ControllerAdvice
@Slf4j
public class VaultServiceExceptionHandler extends ResponseEntityExceptionHandler {

    @Autowired
    private ErrorEntityBuilder builder;

    @ExceptionHandler(ValidationException.class)
    public ResponseEntity<ErrorEntity> handleAccountException(ValidationException ex) {
        ErrorEntity error;
        String errorMessage = ex.getMessage();
        Integer index = ex.getIndex();
        String developerMessage = (index == null) ? null : ("Failed to process the request. Index: " + index);
        error = builder.build(errorMessage, developerMessage);
        return new ResponseEntity<>(error, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(DataNotFoundException.class)
    public ResponseEntity<ErrorEntity> handleAccountException(DataNotFoundException ex) {
        ErrorEntity error;
        String errorMessage = ex.getMessage();
        String devMessage = ex.getDevMessage();
        if (DATA_NOT_FOUND.equals(errorMessage)) {
            error = builder.build(errorMessage, devMessage);
            return new ResponseEntity<>(error, HttpStatus.NOT_FOUND);
        }
        error = builder.buildWithMoreInfo(INTERNAL_SERVER_ERROR, ex.getMessage());
        return new ResponseEntity<>(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    @ExceptionHandler(VaultServiceException.class)
    public ResponseEntity<ErrorEntity> handleAccountException(VaultServiceException ex, WebRequest request) {
        ErrorEntity error;
        String errorMessage = ex.getMessage();
        switch (errorMessage) {
            case BLUEFIN_TOKENIZE_EXECPTION:
            case BLUEFIN_DETOKENIZE_EXECPTION:
            case BLUEFIN_NOT_SUPPORTED:
            case BLUEFIN_TIMEOUT_EXECPTION:
                error = builder.build(errorMessage);
                return new ResponseEntity<>(error, HttpStatus.INTERNAL_SERVER_ERROR);
            default:
                error = builder.buildWithMoreInfo(INTERNAL_SERVER_ERROR, ex.getMessage());
                if (ex.getCause() != null) {
                    error = builder.buildWithMoreInfo(INTERNAL_SERVER_ERROR, UNHANDLED_EXCEPTION_MESSAGE);
                }
                return new ResponseEntity<>(error, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @ExceptionHandler(Throwable.class)
    public ResponseEntity<ErrorEntity> handleException(Throwable ex) {
        log.error("Error:: ", ex);
        ErrorEntity error = builder.buildWithMoreInfo(INTERNAL_SERVER_ERROR, UNHANDLED_EXCEPTION_MESSAGE);
        return new ResponseEntity<>(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    @ExceptionHandler(LegacyVaultServiceException.class)
    public ResponseEntity<ErrorEntity> handleAccountException(LegacyVaultServiceException ex) {
        return new ResponseEntity<>(ex.getErrorEntityInternal().getErrorEntity(),
                HttpStatus.valueOf(ex.getErrorEntityInternal().getHttpStatusCode()));
    }
}
