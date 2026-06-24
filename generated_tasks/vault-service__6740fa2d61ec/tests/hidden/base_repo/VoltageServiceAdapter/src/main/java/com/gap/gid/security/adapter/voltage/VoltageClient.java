package com.gap.gid.security.adapter.voltage;

import com.gap.gid.security.adapter.dto.TokenDTO;
import com.gap.gid.security.adapter.exceptions.TokenizationFailedException;
import com.gap.gid.security.adapter.voltage.dto.VoltagePropertiesDTO;
import com.voltage.v1.client.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.ws.client.core.support.WebServiceGatewaySupport;
import org.springframework.ws.soap.client.SoapFaultClientException;
import org.springframework.ws.soap.client.core.SoapActionCallback;
import lombok.extern.slf4j.Slf4j;

import java.util.List;

@Slf4j
public class VoltageClient extends WebServiceGatewaySupport{

    private static final String TOKENIZE_EXCEPTION_MESSAGE =
            "The tokenize process didn't work, a fault response was received";
    private static final String TOKENIZE_UNEXPECTED_EXCEPTION_MESSAGE =
            "An unhandled error ocurred when trying to tokenize a credit card";
    private static final String DETOKENIZE_EXCEPTION_MESSAGE =
            "The deTokenize process didn't worked, a fault response was received";
    private static final String DETOKENIZE_UNEXPECTED_EXCEPTION_MESSAGE =
            "An unhandled error ocurred when trying to deTokenize a credit card";
    private static final String PROTECT_FORMATTED_DATA = "ProtectFormattedData";
    private static final String ACCESS_FORMATTED_DATA = "AccessFormattedData";
    private static final String PROTECT_FORMATTED_DATA_LIST = "ProtectFormattedDataList";
    private static final String ACCESS_FORMATTED_DATA_LIST = "AccessFormattedDataList";

    @Autowired
    private VoltagePropertiesDTO properties;
    private static final int VOLTAGE_TIMEOUT_TIMER = 20;


    public String tokenize(String creditCard) {
        Long startTime = System.currentTimeMillis();
        try {
            logMessage("Calling voltage's tokenizing service ...");
            ProtectFormattedDataResponse response = (ProtectFormattedDataResponse) getWebServiceTemplate().marshalSendAndReceive(properties.getServiceUrl(), createProtectFormattedData(creditCard),
                    new SoapActionCallback(properties.getCallbackUrl() + "/" + PROTECT_FORMATTED_DATA));
            logMessage("Received response from voltage's tokenizing service ...");
            return response.getDataOut();
        } catch (SoapFaultClientException faultResponse) {
            throw handleExceptionLogMaskedData(faultResponse, TOKENIZE_EXCEPTION_MESSAGE, creditCard);
        } catch (Exception exn) {
            throw handleExceptionLogMaskedData(exn, TOKENIZE_UNEXPECTED_EXCEPTION_MESSAGE, creditCard);
        } finally {
            Long endTime = System.currentTimeMillis();
            Long totalTime = endTime - startTime;
            if (totalTime > VOLTAGE_TIMEOUT_TIMER) {
                log.info("Time taken for Voltage tokenize : " + totalTime + " with thread id: " + Thread.currentThread().getId());
            }
        }
    }


    public String deTokenize(TokenDTO token) {
        Long startTime = System.currentTimeMillis();
        try {
            validateToken(token);
            logMessage("Calling voltage's deTokenizing service ...");
            AccessFormattedDataResponse data = (AccessFormattedDataResponse) getWebServiceTemplate().marshalSendAndReceive(properties.getServiceUrl(), createAccessFormattedData(token),
                    new SoapActionCallback(properties.getCallbackUrl() + "/" + ACCESS_FORMATTED_DATA));
            logMessage("Received response from voltage's deTokenizing service ...");
            return data.getDataOut();
        } catch (SoapFaultClientException faultResponse) {
            throw handleException(faultResponse, DETOKENIZE_EXCEPTION_MESSAGE);
        } catch (Exception exn) {
            throw handleException(exn, DETOKENIZE_UNEXPECTED_EXCEPTION_MESSAGE);
        } finally {
            Long endTime = System.currentTimeMillis();
            Long totalTime = endTime - startTime;
            if (totalTime > VOLTAGE_TIMEOUT_TIMER) {
                log.info("Time taken for Voltage de-tokenize : " + totalTime + " with thread id: " + Thread.currentThread().getId());
            }
        }
    }


    public List<String> tokenize(List<String> data) {
        Long startTime = System.currentTimeMillis();
        try {
            logMessage("Calling voltage's tokenizing service ...");
            ProtectFormattedDataListResponse response = (ProtectFormattedDataListResponse) getWebServiceTemplate().marshalSendAndReceive(properties.getServiceUrl(), createProtectFormattedDataList(data),
                    new SoapActionCallback(properties.getCallbackUrl() + "/" + PROTECT_FORMATTED_DATA_LIST));
            return response.getDataOut();
        } catch (SoapFaultClientException faultResponse) {
            throw handleException(faultResponse, TOKENIZE_EXCEPTION_MESSAGE);
        } catch (Exception exn) {
            throw handleException(exn, TOKENIZE_UNEXPECTED_EXCEPTION_MESSAGE);
        } finally {
            Long endTime = System.currentTimeMillis();
            Long totalTime = endTime - startTime;
            if (totalTime > VOLTAGE_TIMEOUT_TIMER) {
                log.info("Time taken for Voltage tokenize : " + totalTime + " with thread id: " + Thread.currentThread().getId());
            }
        }
    }


    public List<String> deTokenize(List<String> data) {
        Long startTime = System.currentTimeMillis();
        try {
            logMessage("Calling voltage's deTokenizing service ...");
            AccessFormattedDataListResponse response = (AccessFormattedDataListResponse) getWebServiceTemplate().marshalSendAndReceive(properties.getServiceUrl(), createAccessFormattedDataList(data),
                    new SoapActionCallback(properties.getCallbackUrl() + "/" + ACCESS_FORMATTED_DATA_LIST));
            return response.getDataOut();
        } catch (SoapFaultClientException faultResponse) {
            throw handleException(faultResponse, DETOKENIZE_EXCEPTION_MESSAGE);
        } catch (Exception exn) {
            throw handleException(exn, DETOKENIZE_UNEXPECTED_EXCEPTION_MESSAGE);
        } finally {
            Long endTime = System.currentTimeMillis();
            Long totalTime = endTime - startTime;
            if (totalTime > VOLTAGE_TIMEOUT_TIMER) {
                log.info("Time taken for Voltage de-tokenize : " + totalTime + " with thread id: " + Thread.currentThread().getId());
            }
        }
    }

    public VoltagePropertiesDTO getProperties() {
        return properties;
    }

    private ProtectFormattedData createProtectFormattedData(String data) {
        ProtectFormattedData protectFormattedData = new ProtectFormattedData();
        protectFormattedData.setAuthInfo(properties.getTokenizeAuthInfo());
        protectFormattedData.setAuthMethod(AuthMethod.valueOf("SHARED_SECRET"));
        protectFormattedData.setDataIn(data);
        protectFormattedData.setFormat(properties.getFormat());
        protectFormattedData.setIdentity(properties.getIdentity());
        return protectFormattedData;
    }

    private ProtectFormattedDataList createProtectFormattedDataList(List<String> data) {
        ProtectFormattedDataList protectFormattedData = new ProtectFormattedDataList();
        protectFormattedData.setAuthInfo(getProperties().getTokenizeAuthInfo());
        protectFormattedData.setAuthMethod(AuthMethod.valueOf("SHARED_SECRET"));
        protectFormattedData.getDataIn().addAll(data);
        protectFormattedData.setFormat(properties.getFormat());
        protectFormattedData.setIdentity(properties.getIdentity());
        return protectFormattedData;
    }

    private AccessFormattedData createAccessFormattedData(TokenDTO token) {
        AccessFormattedData formattedData = new AccessFormattedData();
        formattedData.setAuthInfo(getProperties().getDeTokenizeAuthInfo());
        formattedData.setAuthMethod(AuthMethod.valueOf("SHARED_SECRET"));
        formattedData.setDataIn(token.getToken());
        formattedData.setFormat(properties.getFormat());
        formattedData.setIdentity(properties.getIdentity());
        return formattedData;
    }

    private AccessFormattedDataList createAccessFormattedDataList(List<String> data) {
        AccessFormattedDataList formattedData = new AccessFormattedDataList();
        formattedData.setAuthInfo(getProperties().getDeTokenizeAuthInfo());
        formattedData.setAuthMethod(AuthMethod.valueOf("SHARED_SECRET"));
        formattedData.getDataIn().addAll(data);
        formattedData.setFormat(properties.getFormat());
        formattedData.setIdentity(properties.getIdentity());
        return formattedData;
    }


    /**
     * Handles the client's exception
     *
     * @param parentException Parent exception
     * @param message Message
     * @return TokenizationFailedException
     */
    private TokenizationFailedException handleException(Exception parentException, String message) {
        log.error(message, parentException);

        StringBuilder exMessage = new StringBuilder();
        exMessage.append(message);
        if (parentException instanceof SoapFaultClientException) {
            SoapFaultClientException fResp = (SoapFaultClientException) parentException;
            exMessage.append("\nThis error could be due to bad data. Please check your data.. \n");
            exMessage.append(String.format("Voltage Error Code: %s \nVoltage Error Message: %s ", fResp
                    .getFaultStringOrReason(), String.valueOf(fResp.getFaultCode())));
        }
        return new TokenizationFailedException(exMessage.toString(), parentException);
    }

    /**
     * Handles the client's exception
     *
     * @param parentException Parent exception
     * @param message Message
     * @param data that caused the exception
     * @return TokenizationFailedException
     */
    private TokenizationFailedException handleExceptionLogMaskedData(Exception parentException, String message,
                                                                     String data) {
        log.error(message, parentException);

        StringBuilder exMessage = new StringBuilder();
        exMessage.append(message);
        if (parentException instanceof SoapFaultClientException) {
            SoapFaultClientException fResp = (SoapFaultClientException) parentException;
            exMessage
                    .append("\nVAULT_TOK_ERR_001 : This error could be due to bad data. Please check the data format (Numbers Masked for security reasons): \""
                            + maskNumbers(data) + "\". ");
            exMessage.append(String.format("Voltage Error Code: %s \nVoltage Error Message: %s ", fResp
                    .getFaultStringOrReason(), String.valueOf(fResp.getFaultCode())));
        }
        return new TokenizationFailedException(exMessage.toString(), parentException);
    }

    private static String maskNumbers(String dataString) {
        return dataString.replaceAll("[0-9]", "N");
    }

    private void validateToken(TokenDTO token) {
        if (token == null || token.getToken() == null || token.getToken().length() == 0) {
            throw new TokenizationFailedException("Invalid token:Token cannot be null or empty String");
        }
    }

    private void logMessage(String msg) {
        if (log.isDebugEnabled()) {
            log.debug(msg);
        }
    }
}
