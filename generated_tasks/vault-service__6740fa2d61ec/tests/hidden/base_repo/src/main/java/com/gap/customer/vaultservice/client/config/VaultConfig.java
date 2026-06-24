package com.gap.customer.vaultservice.client.config;

import com.gap.customer.vaultservice.client.restclient.config.VaultRestClientConfig;
import com.gap.customer.vaultservice.models.DataType;
import com.gap.customer.vaultservice.models.DataTypeKeyData;
import com.gap.customer.vaultservice.models.VaultDataScopeConfig;
import com.gap.customer.vaultservice.services.config.ServiceRetryConfiguration;
import java.io.IOException;
import java.util.Properties;
import javax.ws.rs.client.WebTarget;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.config.PropertiesFactoryBean;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.retry.support.RetryTemplate;
import org.springframework.stereotype.Component;

@Configuration
public class VaultConfig {


    @Bean
    @Qualifier("vault")
    public WebTarget vaultWebTarget(VaultRestConnection vaultConnection) {
        return vaultConnection.getTarget();
    }


    @Bean
    @Qualifier("vault-preview")
    public WebTarget vaultPreviewWebTarget(VaultRestConnection vaultConnection) {
        return vaultConnection.getPreviewTarget();
    }



    @Bean
    @Qualifier("vault")
    public RetryTemplate vaultRetryTemplate(Retry retry) {
        return retry.getRetryTemplate();
    }



    @Bean
    @ConfigurationProperties(prefix = "filter-service")
    public VaultDataScopeConfig vaultDataScopeConfig(){
        return new VaultDataScopeConfig();
    }



    @Component
    @ConfigurationProperties(prefix = "vault.service")
    public static class VaultRestConnection extends VaultRestClientConfig {

    }

    @ConfigurationProperties(prefix = "vault.service")
    @Component
    public static class Retry extends ServiceRetryConfiguration {
    }

    @Bean(name="ingrianProps")
    public Properties ingrainPropertiesFactoryBean(@Value("${ingrian.configfile}") String fileName) throws IOException {
        PropertiesFactoryBean propertiesFactoryBean = new PropertiesFactoryBean();
        propertiesFactoryBean.setLocation(new ClassPathResource(fileName));
        propertiesFactoryBean.afterPropertiesSet();
        return propertiesFactoryBean.getObject();
    }

    @Bean(name="dataTypeDAO")
    public DataType dataTypeDAO()  {
        DataType dataType = new DataType();
        return dataType;
    }

    @Bean(name="dataTypeKeyDataDAO")
    public DataTypeKeyData dataTypeKeyDataDAO() {
        DataTypeKeyData dataTypeKeyData =   DataTypeKeyData.builder().build();
        return dataTypeKeyData;
    }

    @Bean(name="serverProps")
    public Properties serverPropertiesFactoryBean(@Value("${vaultserver.configfile}") String fileName) throws IOException {
        PropertiesFactoryBean propertiesFactoryBean = new PropertiesFactoryBean();
        propertiesFactoryBean.setLocation(new ClassPathResource(fileName));
        propertiesFactoryBean.afterPropertiesSet();
        return propertiesFactoryBean.getObject();
    }
}