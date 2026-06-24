package com.gap.gid.config;

import lombok.Setter;
import lombok.extern.slf4j.Slf4j;
import org.apache.http.config.Registry;
import org.apache.http.config.RegistryBuilder;
import org.apache.http.conn.socket.ConnectionSocketFactory;
import org.apache.http.conn.socket.PlainConnectionSocketFactory;
import org.apache.http.conn.ssl.SSLConnectionSocketFactory;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.impl.client.HttpClientBuilder;
import org.apache.http.impl.conn.PoolingHttpClientConnectionManager;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

import javax.net.ssl.SSLContext;
import java.security.KeyManagementException;
import java.security.NoSuchAlgorithmException;

@Configuration
@Slf4j
@Setter
public class RestTemplateConfig {

    private static final String SSL_PROTOCOL = "TLSv1.2";

    @Autowired
    private ApplicationContext applicationContext;

    @Value("${restTemplate.connectTimeOut}")
    private Integer connectTimeOut;
    @Value("${restTemplate.tokenizeTimeOut:50}")
    private Integer tokenizeSocketTimeOut;
    @Value("${restTemplate.bulkTokenizeTimeOut:80}")
    private Integer bulkTokenizeSocketTimeOut;
    @Value("${restTemplate.detokenizeTimeOut:50}")
    private Integer detokenizeSocketTimeOut;
    @Value("${restTemplate.bulkDetokenizeTimeOut:80}")
    private Integer bulkDetokenizeSocketTimeOut;
    @Value("${restTemplate.httpClientsMaxConnTotal}")
    private Integer maxConnections;
    @Value("${restTemplate.httpClientsMaxConnPerRoute}")
    private Integer maxConnectionsPerRoute;
    @Value("${restTemplate.httpClientsValidateAfterInactivity}")
    private Integer validateAfterInactivity;
    @Value("${restTemplate.httpClientsCheckoutConnTimeout}")
    private Integer checkoutConnectionFromPoolTimeoutInMillis;

    @Bean(name = "restTemplateTokenize")
    public RestTemplate restTemplateTokenize() {
        try {
            HttpComponentsClientHttpRequestFactory factory = getHttpComponentsClientHttpRequestFactory(tokenizeSocketTimeOut);
            return new RestTemplate(factory);
        } catch (Exception e) {
            log.error("Bluefin:RestTemplateConfig: restTemplate:cannot create rest template", e);
            throw new RuntimeException(e);
        }
    }

    @Bean(name = "restTemplateBulkTokenize")
    public RestTemplate restTemplateBulkTokenize() {
        try {
            HttpComponentsClientHttpRequestFactory factory = getHttpComponentsClientHttpRequestFactory(bulkTokenizeSocketTimeOut);
            return new RestTemplate(factory);
        } catch (Exception e) {
            log.error("Bluefin:RestTemplateConfig: restTemplate:cannot create rest template", e);
            throw new RuntimeException(e);
        }
    }

    @Bean(name = "restTemplateDetokenize")
    public RestTemplate restTemplateDetokenize() {
        try {
            HttpComponentsClientHttpRequestFactory factory = getHttpComponentsClientHttpRequestFactory(detokenizeSocketTimeOut);
            return new RestTemplate(factory);
        } catch (Exception e) {
            log.error("Bluefin:RestTemplateConfig: restTemplate:cannot create rest template", e);
            throw new RuntimeException(e);
        }
    }

    @Bean(name = "restTemplateBulkDetokenize")
    public RestTemplate restTemplateBulkDetokenize() {
        try {
            HttpComponentsClientHttpRequestFactory factory = getHttpComponentsClientHttpRequestFactory(bulkDetokenizeSocketTimeOut);
            return new RestTemplate(factory);
        } catch (Exception e) {
            log.error("Bluefin:RestTemplateConfig: restTemplate:cannot create rest template", e);
            throw new RuntimeException(e);
        }
    }

    private HttpComponentsClientHttpRequestFactory getHttpComponentsClientHttpRequestFactory(Integer readTimeout) {
        try {
            PoolingHttpClientConnectionManager connectionManager = createConnectionManager();
            CloseableHttpClient httpClient = HttpClientBuilder.create()
                    .setConnectionManager(connectionManager).build();
            HttpComponentsClientHttpRequestFactory factory = new HttpComponentsClientHttpRequestFactory(httpClient);
            factory.setReadTimeout(readTimeout);
            factory.setConnectTimeout(connectTimeOut);
            factory.setConnectionRequestTimeout(checkoutConnectionFromPoolTimeoutInMillis);
            return factory;
        } catch (KeyManagementException | NoSuchAlgorithmException e) {
            throw new RuntimeException(e);
        }
    }

    private PoolingHttpClientConnectionManager createConnectionManager() throws NoSuchAlgorithmException, KeyManagementException {

        SSLContext sslContext = SSLContext.getInstance(SSL_PROTOCOL);
        sslContext.init(null, null, null);

        SSLConnectionSocketFactory sslConnectionSocketFactory = new SSLConnectionSocketFactory(sslContext);
        final Registry<ConnectionSocketFactory> registry = RegistryBuilder.<ConnectionSocketFactory>create()
                .register("http", PlainConnectionSocketFactory.getSocketFactory())
                .register("https", sslConnectionSocketFactory)
                .build();

        PoolingHttpClientConnectionManager connectionManager = new PoolingHttpClientConnectionManager(registry);
        connectionManager.setMaxTotal(maxConnections);
        connectionManager.setDefaultMaxPerRoute(maxConnectionsPerRoute);
        connectionManager.setValidateAfterInactivity(validateAfterInactivity);

        return connectionManager;
    }

    private void updateRestTemplate(Integer timeout, String restTemplateName)
    {
        RestTemplate tokenizeTemplate = (RestTemplate) applicationContext.getBean(restTemplateName);
        HttpComponentsClientHttpRequestFactory factory = (HttpComponentsClientHttpRequestFactory) tokenizeTemplate.getRequestFactory();
        factory.setReadTimeout(timeout);
        tokenizeTemplate.setRequestFactory(factory);
    }

    public void updateBlufinTimeout(Integer tokenizeTimeout, Integer bulkTokenizeTimeout, Integer detokenizeTimeout, Integer bulkDetokenizeTimeout) {
        updateTokenizeTimeout(tokenizeTimeout);
        updateBulkTokenizeTimeout(bulkTokenizeTimeout);
        updateDetokenizeTimeout(detokenizeTimeout);
        updateBulkDetokenizeTimeout(bulkDetokenizeTimeout);
    }

    private void updateTokenizeTimeout(Integer tokenizeTimeout) {
        if (!tokenizeSocketTimeOut.equals(tokenizeTimeout)) {
            updateRestTemplate(tokenizeTimeout, "restTemplateTokenize");
            tokenizeSocketTimeOut = tokenizeTimeout;
        }
    }

    private void updateBulkTokenizeTimeout(Integer bulkTokenizeTimeout) {
        if (!bulkTokenizeSocketTimeOut.equals(bulkTokenizeTimeout)) {
            updateRestTemplate(bulkTokenizeTimeout, "restTemplateBulkTokenize");
            bulkTokenizeSocketTimeOut = bulkTokenizeTimeout;
        }
    }

    private void updateDetokenizeTimeout(Integer detokenizeTimeout) {
        if (!detokenizeSocketTimeOut.equals(detokenizeTimeout)) {
            updateRestTemplate(detokenizeTimeout, "restTemplateDetokenize");
            detokenizeSocketTimeOut = detokenizeTimeout;
        }
    }

    private void updateBulkDetokenizeTimeout(Integer bulkDetokenizeTimeout) {
        if (!bulkDetokenizeSocketTimeOut.equals(bulkDetokenizeTimeout)) {
            updateRestTemplate(bulkDetokenizeTimeout, "restTemplateBulkDetokenize");
            bulkDetokenizeSocketTimeOut = bulkDetokenizeTimeout;
        }
    }
}
