package com.gap.customer.vaultservice.client.restclient.impl;


import java.util.Map;



import javax.ws.rs.client.WebTarget;


import com.gap.customer.vaultservice.client.restclient.VaultRestClient;
import com.gap.customer.vaultservice.controller.TraceHeaders;
import lombok.extern.slf4j.Slf4j;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;

import org.springframework.stereotype.Component;

import com.gap.customer.vaultservice.error.ErrorCodes;
import com.gap.customer.vaultservice.error.ErrorEntity;
import com.gap.customer.vaultservice.error.ErrorEntityInternal;
import com.gap.customer.vaultservice.error.ErrorEntityMessage;
import com.gap.customer.vaultservice.exception.LegacyVaultServiceException;
import com.gap.customer.vaultservice.models.VaultClientRequest;
import com.gap.customer.vaultservice.models.VaultClientResponse;

@Slf4j
@Component
public class VaultRestClientImpl implements VaultRestClient {

	private static final Integer HTTP_STATUS_INTERNAL_SERVER_ERROR = 500;
	private static final String LEGACY_DEVELOPER_ERROR_MESSAGE = "Response is null from legacy vault service : ";


	private final WebTarget target;
	private final WebTarget previewtarget;



	@Autowired
	public VaultRestClientImpl(@Qualifier("vault") WebTarget target, @Qualifier("vault-preview")WebTarget previewtarget) {
		this.target = target;
		this.previewtarget = previewtarget;

	}

	public WebTarget getHealthCheckTarget() {
		return target.path("f5.jsp");
	}


	public VaultClientResponse getVaultClientResponse(Map<String, String> headers, String path, VaultClientRequest vaultClientRequest) throws LegacyVaultServiceException {
		boolean isPreview = Boolean.parseBoolean(headers.get(TraceHeaders.X_PREVIEW_HEADER));
		if (isPreview) {
			if (log.isDebugEnabled()) {
				log.info("VaultService:the value of isPreview is " + isPreview);
			}
			return   buildResponse(previewtarget, headers, path, vaultClientRequest);
		}
		return buildResponse(target, headers, path, vaultClientRequest);
	}


	public VaultClientResponse buildResponse(WebTarget target, Map<String, String> headers, String path, VaultClientRequest vaultClientRequest) throws LegacyVaultServiceException {
		VaultClientResponse vaultClientResponse = null;

		try {
			if (log.isDebugEnabled()) {
				log.info("VaultService:the visit of legacy service base is : " + target.getUri());
			}
			vaultClientResponse =  VaultRestClientRetry.getInstance().retryVaultRestClient(target, headers, path, vaultClientRequest);
		} catch (LegacyVaultServiceException e) {
			if (log.isDebugEnabled()) {
				log.info("VaultService:the exception occured at retry " + e.getCause());
			}
			throw new LegacyVaultServiceException(new ErrorEntityInternal(HTTP_STATUS_INTERNAL_SERVER_ERROR,
					new ErrorEntity(LEGACY_DEVELOPER_ERROR_MESSAGE + HTTP_STATUS_INTERNAL_SERVER_ERROR,
							ErrorEntityMessage.INTERNAL_SERVER_ERROR_USERMESSAGE ,
							Integer.valueOf(ErrorCodes.INTERNAL_SERVER_ERROR), null)),
					null);

		}

		return vaultClientResponse;
	}
}