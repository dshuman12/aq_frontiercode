package com.gap.customer.vaultservice.client.restclient.impl;

import com.gap.customer.vaultservice.error.*;
import com.gap.customer.vaultservice.exception.LegacyVaultServiceException;
import com.gap.customer.vaultservice.models.VaultClientRequest;
import com.gap.customer.vaultservice.models.VaultClientResponse;
import lombok.extern.slf4j.Slf4j;
import org.apache.http.conn.ConnectTimeoutException;
import org.springframework.retry.RetryCallback;
import org.springframework.retry.RetryContext;
import org.springframework.retry.support.RetryTemplate;

import javax.ws.rs.ProcessingException;
import javax.ws.rs.client.Entity;
import javax.ws.rs.client.Invocation;
import javax.ws.rs.client.WebTarget;
import javax.ws.rs.core.Response;
import java.net.UnknownHostException;
import java.util.Map;
import java.util.concurrent.TimeoutException;

import static javax.ws.rs.core.MediaType.APPLICATION_JSON;

@Slf4j

public class VaultRestClientRetry {


    private static final VaultRestClientRetry instance  = new VaultRestClientRetry();
    private static RetryTemplate retryTemplate;

    public static VaultRestClientRetry getInstance(){
        retryTemplate = new RetryTemplate();
        return instance;
    }

    private static final Integer HTTP_STATUS_INTERNAL_SERVER_ERROR = 500;
    private static final String DEVELOPER_ERROR_MESSAGE = "Error response from legacy vault service : ";
    private static final String LEGACY_DEVELOPER_ERROR_MESSAGE = "Response is null from legacy vault service : ";
    private static final String TIMEOUT_DEVELOPER_ERROR_MESSAGE = "Timeout Exception: ";
    private static final String PROCESSING_EXCEPTION_DEVELOPER_ERROR_MESSAGE = "Processing error: ";
    private static final String UNKNOWNHOST_EXCEPTION_DEVELOPER_ERROR_MESSAGE = "Unknown host error: ";


    public  VaultClientResponse retryVaultRestClient(WebTarget target, Map<String, String> headers, String path, VaultClientRequest vaultClientRequest) throws LegacyVaultServiceException {
        Response response = null;
        VaultClientResponse vaultClientResponse = null;
        try {
            response = this.retryTemplate.execute(new RetryCallback<Response, Exception>() {
                @Override
                public Response doWithRetry(RetryContext context) throws Exception {
                    if (log.isDebugEnabled()) {
                        if (log.isDebugEnabled()) {
                            log.info("VaultService:VaultRestClient  call try # {}", context.getRetryCount());
                        }

                    }
                    Invocation.Builder builder = target.path(path).request(APPLICATION_JSON);
                    for (Map.Entry<String, String> header : headers.entrySet()) {
                        builder = builder.header(header.getKey(), header.getValue());
                    }

                    return builder.post(Entity.entity(vaultClientRequest, APPLICATION_JSON));
                }
            });

            if (response == null) {
                throw new LegacyVaultServiceException(new ErrorEntityInternal(HTTP_STATUS_INTERNAL_SERVER_ERROR,
                        new ErrorEntity(LEGACY_DEVELOPER_ERROR_MESSAGE + HTTP_STATUS_INTERNAL_SERVER_ERROR,
                                ErrorEntityMessage.INTERNAL_SERVER_ERROR_USERMESSAGE,
                                Integer.valueOf(ErrorCodes.INTERNAL_SERVER_ERROR), null)),
                        null);
            }
            if (log.isDebugEnabled()) {
                log.info("VaultService:The client request " + vaultClientRequest);
            }
            vaultClientResponse = response.readEntity(VaultClientResponse.class);
            if (log.isDebugEnabled()) {
                log.info("VaultService:the client response message " + vaultClientResponse.getResult());
            }


        } catch (Exception e) {
               vaultRestClientException(response, e);
        } finally {
            /**
             * You should always make sure that the underlying JAX-RS response
             * is closed. While most JAX-RS containers will have their Response
             * objects implement a finalize() method, it is not a good idea to
             * rely on the garbage collector to clean up your client
             * connections. If you do not clean up your connections, you may end
             * up with intermittent errors that pop up if the underlying Client
             * or operating system has exhausted its limit of allowable open
             * connections.
             */
            if (response != null) {
                response.close();
            }
        }
        return vaultClientResponse;
     }


      private void vaultRestClientException(Response response , Exception e) throws LegacyVaultServiceException {

          int statusCode = response != null ? response.getStatus() : HTTP_STATUS_INTERNAL_SERVER_ERROR;

          if (e.getCause() instanceof TimeoutException) {
              throw new LegacyVaultServiceException(new ErrorEntityInternal(statusCode,
                      new ErrorEntity(TIMEOUT_DEVELOPER_ERROR_MESSAGE + statusCode,
                              ErrorEntityMessage.INTERNAL_SERVER_ERROR_USERMESSAGE,
                              Integer.valueOf(ErrorCodes.INTERNAL_SERVER_ERROR), null)),
                      e);
          } else if (e.getCause() instanceof ConnectTimeoutException) {
              throw new LegacyVaultServiceException(new ErrorEntityInternal(statusCode,
                      new ErrorEntity(TIMEOUT_DEVELOPER_ERROR_MESSAGE + statusCode,
                              ErrorEntityMessage.INTERNAL_SERVER_ERROR_USERMESSAGE,
                              Integer.valueOf(ErrorCodes.INTERNAL_SERVER_ERROR), null)),
                      e);
          } else if (e.getCause() instanceof ProcessingException) {
              throw new LegacyVaultServiceException(new ErrorEntityInternal(statusCode,
                      new ErrorEntity(PROCESSING_EXCEPTION_DEVELOPER_ERROR_MESSAGE + statusCode,
                              ErrorEntityMessage.INTERNAL_SERVER_ERROR_USERMESSAGE,
                              Integer.valueOf(ErrorCodes.INTERNAL_SERVER_ERROR), null)),
                      e);
          } else if (e.getCause() instanceof UnknownHostException) {
              throw new LegacyVaultServiceException(new ErrorEntityInternal(statusCode,
                      new ErrorEntity(UNKNOWNHOST_EXCEPTION_DEVELOPER_ERROR_MESSAGE + statusCode,
                              ErrorEntityMessage.INTERNAL_SERVER_ERROR_USERMESSAGE,
                              Integer.valueOf(ErrorCodes.INTERNAL_SERVER_ERROR), null)),
                      e);
          } else {
              throw new LegacyVaultServiceException(new ErrorEntityInternal(statusCode,
                      new ErrorEntity(DEVELOPER_ERROR_MESSAGE + statusCode,
                              ErrorEntityMessage.INTERNAL_SERVER_ERROR_USERMESSAGE,
                              Integer.valueOf(ErrorCodes.INTERNAL_SERVER_ERROR), null)),
                      e);
          }
      }

    }


