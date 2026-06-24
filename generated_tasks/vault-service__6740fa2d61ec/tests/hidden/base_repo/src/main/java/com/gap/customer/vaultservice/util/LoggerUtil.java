package com.gap.customer.vaultservice.util;

import javax.servlet.http.HttpServletRequest;

import org.slf4j.Logger;
import org.springframework.stereotype.Component;

@Component
public class LoggerUtil {
	private static final String HEADER_APP_NAME = "X-App-Name";
	private static final String HEADER_APP_ID = "X-App-Id";
	/**
	 * Example maskedString :Vault Service Request URL::POST/vault-ids/:: Start
	 * Time=1513144899915 Object::[ type= CREDIT_CARD_NUMBER1 plaintext=
	 * *********9999 index= 0 ][ type= CREDIT_CARD_NUMBER plaintext=
	 * *********4440 index= 1 ]
	 * 
	 * @param maskedString,logger,request
	 */
	public void logRequest(String maskedRequest, Logger logger, HttpServletRequest request) {

		logger.debug("Vault Service Request URL::" + request.getMethod() + request.getRequestURI() + ":: Start Time="
				+ System.currentTimeMillis() + " Object::" + maskedRequest);

	}

	/**
	 * Example maskedString :Vault Service Response Time::1513144322977:
	 * Object:[ vaultId= ***** index= 0 ][ vaultId= ***** index= 1 ]
	 * 
	 * @param maskedString,logger
	 */
	public void logResponse(String maskedResponse, Logger logger) {

		logger.debug("Vault Service Response Time::" + System.currentTimeMillis() + ": Object:" + maskedResponse + ":");

	}

	/**
	 * Example maskedString:Vault Service Request URL::POST/vault-ids/Vault
	 * Service Exception Time::1513145081965: Object:[ type= CREDIT_CARD_NUMBER1
	 * plaintext= *********1111 index= 0 ][ type= CREDIT_CARD_NUMBER plaintext=
	 * *********4440 index= 1 ]:
	 * Exception:-com.gap.customer.vaultservice.exception.VaultServiceException: 1
	 * 
	 * @param e,maskedString,logger,request
	 */
	public void logException(Exception e, String maskedRequest, Logger logger, HttpServletRequest request) {
		logger.error("Vault Service Request URL::" + request.getMethod() + request.getRequestURI()
				+ "Vault Service Exception Time::" + System.currentTimeMillis() + ": Object:" + maskedRequest + ":"
				+ ": Exception:", e);

	}

	public void logAppName(Logger logger, HttpServletRequest request) {
		String appName = request.getHeader(HEADER_APP_NAME);
		appName = (appName == null) ? "" : appName;
		String appId = request.getHeader(HEADER_APP_ID);
		appId = (appId == null) ? "" : appId;
		logger.info("Vault Service Request URL::" + request.getMethod() + request.getRequestURI() + ": ClientAppName:" + appName + ": CliendAppId:" + appId + ":");
	}
}
