package com.gap.gid.security.adapter.voltage.dto;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Wrapper object to all the voltage specific configuration parameters
 *
 * @author Hallisson Santos
 *
 */

@Component
@ConfigurationProperties(prefix="voltage.service")
public class VoltagePropertiesDTO {

    private String identity;
    private String tokenizeAuthInfo;
    private String deTokenizeAuthInfo;
    private String format;
    private String callbackUrl;
    private String serviceUrl;
    private int connectionTimeout;
    private int readTimeout;
    private int maxTotalConnections;

    /**
     * @return the identity
     */
    public String getIdentity() {
        return identity;
    }

    /**
     * @param identity the identity to set
     */
    public void setIdentity(String identity) {
        this.identity = identity;
    }

    /**
     * @return the tokenizeAuthInfo
     */
    public String getTokenizeAuthInfo() {
        return tokenizeAuthInfo;
    }

    /**
     * @param tokenizeAuthInfo the tokenizeAuthInfo to set
     */
    public void setTokenizeAuthInfo(String tokenizeAuthInfo) {
        this.tokenizeAuthInfo = tokenizeAuthInfo;
    }

    /**
     * @return the deTokenizeAuthInfo
     */
    public String getDeTokenizeAuthInfo() {
        return deTokenizeAuthInfo;
    }

    /**
     * @param deTokenizeAuthInfo the deTokenizeAuthInfo to set
     */
    public void setDeTokenizeAuthInfo(String deTokenizeAuthInfo) {
        this.deTokenizeAuthInfo = deTokenizeAuthInfo;
    }

    /**
     * @return the format
     */
    public String getFormat() {
        return format;
    }

    /**
     * @param format the format to set
     */
    public void setFormat(String format) {
        this.format = format;
    }

    /**
     *
     * @return the callbackUrl
     */
    public String getCallbackUrl() { return callbackUrl;}

    /**
     *
     * @param callbackUrl
     */
    public void setCallbackUrl(String callbackUrl) {this.callbackUrl = callbackUrl;}

    /**
     *
     * @return serviceUrl
     */
    public String getServiceUrl() { return serviceUrl;}

    /**
     *
     * @param serviceUrl
     */
    public void setServiceUrl(String serviceUrl) {this.serviceUrl = serviceUrl;}

    /**
     *
     * @return connectionTimeout
     */
    public int getConnectionTimeout() { return connectionTimeout;}

    /**
     *
     * @param connectionTimeout
     */
    public void setConnectionTimeout(int connectionTimeout) {this.connectionTimeout = connectionTimeout;}

    /**
     *
     * @return readTimeout
     */
    public int getReadTimeout() {return readTimeout;}

    /**
     *
      * @param readTimeout
     */
    public void setReadTimeout(int readTimeout) {this.readTimeout = readTimeout;}

    /**
     *
     * @return maxTotalConnections
     */
    public int getMaxTotalConnections() {return maxTotalConnections;}

    /**
     *
     * @param maxTotalConnections
     */
    public void setMaxTotalConnections(int maxTotalConnections) {this.maxTotalConnections = maxTotalConnections;}

}
