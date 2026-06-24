package com.gap.customer.vaultservice.client.restclient.config;

import lombok.Getter;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;
import org.apache.http.client.config.RequestConfig;
import org.apache.http.config.Registry;
import org.apache.http.config.RegistryBuilder;
import org.apache.http.conn.socket.ConnectionSocketFactory;
import org.apache.http.conn.socket.PlainConnectionSocketFactory;
import org.apache.http.conn.ssl.SSLConnectionSocketFactory;
import org.apache.http.impl.conn.PoolingHttpClientConnectionManager;
import org.glassfish.jersey.apache.connector.ApacheClientProperties;
import org.glassfish.jersey.apache.connector.ApacheConnectorProvider;
import org.glassfish.jersey.client.ClientConfig;
import org.glassfish.jersey.client.JerseyClientBuilder;
import org.glassfish.jersey.client.JerseyWebTarget;
import org.springframework.stereotype.Component;

import javax.ws.rs.client.WebTarget;

import static org.glassfish.jersey.client.authentication.HttpAuthenticationFeature.basic;


@Slf4j
@Getter
@Setter
public class VaultRestClientConfig {

    private String baseUrl;
    private String username;
    private String password;
    private int connectTimeoutInMillis;
    private int readTimeoutInMillis;
    private int checkoutConnectionFromPoolTimeoutInMillis;
    private int maxConnections;
    private int maxConnectionPerRoute;
    private String previewBaseUrl;
    private int previewMaxConnections;
    private String previewUserName;
    private String previewPassword;

    public VaultRestClientConfig() {

    }


    public VaultRestClientConfig(String baseUrl, String username, String password,
                                 int connectTimeoutInMillis, int readTimeoutInMillis,
                                 int checkoutConnectionFromPoolTimeoutInMillis, int maxConnections, int maxConnectionPerRoute, String previewBaseUrl, int previewMaxConnections, String previewUserName, String previewPassword  ) {
        if (log.isDebugEnabled()) {
            log.info("VaultService:VaultRestClientConfiguration: constructor");
        }
        this.baseUrl = baseUrl;
        this.username = username;
        this.password = password;
        this.connectTimeoutInMillis = connectTimeoutInMillis;
        this.readTimeoutInMillis = readTimeoutInMillis;
        this.checkoutConnectionFromPoolTimeoutInMillis = checkoutConnectionFromPoolTimeoutInMillis;
        this.maxConnections = maxConnections;
        this.maxConnectionPerRoute = maxConnectionPerRoute;
        this.previewBaseUrl = previewBaseUrl;
        this.previewMaxConnections = previewMaxConnections;
        this.previewUserName = previewUserName;
        this.previewPassword = previewPassword;

    }

    private ClientConfig createClientConfig() {
        if (log.isDebugEnabled()) {
            log.info("VaultService:VaultRestClientConnectionConfiguration: createClientConfig");
        }
        ClientConfig clientConfig = new ClientConfig();
        clientConfig.connectorProvider(new ApacheConnectorProvider());

        RequestConfig requestConfig = RequestConfig.custom()
                .setConnectTimeout(connectTimeoutInMillis)
                .setSocketTimeout(readTimeoutInMillis)
                .setConnectionRequestTimeout(checkoutConnectionFromPoolTimeoutInMillis)
                .build();

        PoolingHttpClientConnectionManager connectionManager = createConnectionManager();
        connectionManager.setMaxTotal(maxConnections);
        connectionManager.setDefaultMaxPerRoute(maxConnectionPerRoute);
        clientConfig.property(ApacheClientProperties.CONNECTION_MANAGER, connectionManager);
        clientConfig.property(ApacheClientProperties.REQUEST_CONFIG, requestConfig);

        clientConfig.register(basic(username, password));

        return clientConfig;
    }


    private ClientConfig createPreviewClientConfig() {
        if (log.isDebugEnabled()) {
            log.info("VaultService:VaultRestClientConnectionConfiguration: createClientConfig");
        }
        ClientConfig clientConfig = new ClientConfig();
        clientConfig.connectorProvider(new ApacheConnectorProvider());

        RequestConfig requestConfig = RequestConfig.custom()
                .setConnectTimeout(connectTimeoutInMillis)
                .setSocketTimeout(readTimeoutInMillis)
                .setConnectionRequestTimeout(checkoutConnectionFromPoolTimeoutInMillis)
                .build();

        PoolingHttpClientConnectionManager connectionManager = createConnectionManager();
        connectionManager.setMaxTotal(previewMaxConnections);
        connectionManager.setDefaultMaxPerRoute(maxConnectionPerRoute);
        clientConfig.property(ApacheClientProperties.CONNECTION_MANAGER, connectionManager);
        clientConfig.property(ApacheClientProperties.REQUEST_CONFIG, requestConfig);

        clientConfig.register(basic(previewUserName, previewPassword));

        return clientConfig;
    }

    public WebTarget getTarget() {
        JerseyWebTarget webTarget =
                new JerseyClientBuilder()
                        .withConfig(createClientConfig())
                        .build()
                        .target(baseUrl);
        if (log.isDebugEnabled()) {
            log.info("VaultService:VaultRestClientConfig: getTarget:uri:" + webTarget.getUri() + ":");
        }
        return webTarget;
    }

    public WebTarget getPreviewTarget() {
        JerseyWebTarget webTarget =
                new JerseyClientBuilder()
                        .withConfig(createPreviewClientConfig())
                        .build()
                        .target(previewBaseUrl);
        if (log.isDebugEnabled()) {
            log.info("VaultService:VaultRestClientConfig: getTarget:uri:" + webTarget.getUri() + ":");
        }
        return webTarget;
    }


    private PoolingHttpClientConnectionManager createConnectionManager() {
        if (log.isDebugEnabled()) {
            log.info("VaultService:VaultRestClientConnectionConfiguration: createConnectionManager");
        }
        final Registry<ConnectionSocketFactory> registry = RegistryBuilder.<ConnectionSocketFactory>create()
                .register("http", PlainConnectionSocketFactory.getSocketFactory())
                .register("https", SSLConnectionSocketFactory.getSystemSocketFactory())
                .build();

        return new PoolingHttpClientConnectionManager(registry);
    }

}