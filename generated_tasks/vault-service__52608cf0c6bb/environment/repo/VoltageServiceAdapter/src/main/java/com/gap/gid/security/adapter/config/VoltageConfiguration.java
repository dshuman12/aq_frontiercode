package com.gap.gid.security.adapter.config;


import com.gap.gid.security.adapter.voltage.VoltageClient;
import com.gap.gid.security.adapter.voltage.VoltageServiceAdapter;
import com.gap.gid.security.adapter.voltage.dto.VoltagePropertiesDTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.oxm.jaxb.Jaxb2Marshaller;
import org.springframework.ws.transport.WebServiceMessageSender;
import org.springframework.ws.transport.http.HttpComponentsMessageSender;

@Configuration
public class VoltageConfiguration {

    @Autowired
    public VoltagePropertiesDTO voltagePropertiesDTO;

    @Bean
    public Jaxb2Marshaller marshaller() {
        Jaxb2Marshaller marshaller = new Jaxb2Marshaller();
        marshaller.setContextPath("com.voltage.v1.client");
        return marshaller;
    }


    @Bean
    public VoltageClient voltageClient(Jaxb2Marshaller marshaller) {
        VoltageClient client = new VoltageClient();
        client.setMarshaller(marshaller);
        client.setUnmarshaller(marshaller);
        client.setMessageSender(webServiceMessageSender());
        return client;
    }

    @Bean
    public WebServiceMessageSender webServiceMessageSender() {
        HttpComponentsMessageSender httpComponentsMessageSender = new HttpComponentsMessageSender();
        httpComponentsMessageSender.setConnectionTimeout(voltagePropertiesDTO.getConnectionTimeout());
        httpComponentsMessageSender.setReadTimeout(voltagePropertiesDTO.getReadTimeout());
//        httpComponentsMessageSender.setMaxTotalConnections(voltagePropertiesDTO.getMaxTotalConnections());
        return httpComponentsMessageSender;
    }

    @Bean(name="serviceAdapter")
    public VoltageServiceAdapter voltageServiceAdapter(VoltageClient voltageClient){
        return new VoltageServiceAdapter(voltageClient);
    }

}
