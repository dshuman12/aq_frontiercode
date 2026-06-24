package com.gap.customer.vaultservice.services.config;


import javax.servlet.http.HttpServletRequest;

import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.models.ExternalDocumentation;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.async.DeferredResult;

import com.fasterxml.classmate.TypeResolver;

import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

@Configuration
@EnableAutoConfiguration
public class SwaggerConfig {

	@Bean
	public OpenAPI vaultServiceApi(SwaggerApiInfo swaggerApiInfo) {
	    
	    Contact contactInfo = new Contact();
	    contactInfo.setName(swaggerApiInfo.contactName);
	    contactInfo.setEmail(swaggerApiInfo.contactEmail);
	    contactInfo.setUrl(swaggerApiInfo.contactUrl);
	    
		return new OpenAPI()
                .info(new Info().title(swaggerApiInfo.title)
                        .description(swaggerApiInfo.description)
                        .version(swaggerApiInfo.version)
                        .contact(contactInfo));
	}

	@ConfigurationProperties(prefix = "springfox.documentation.swagger")
	@Component
	@NoArgsConstructor
	@AllArgsConstructor
	public static class SwaggerApiInfo {
		private String version;
		private String title;
		private String description;
		private String contactName;
		private String contactUrl;
		private String contactEmail;
		private String host;
		private String path;

        public String getVersion() {
            return version;
        }

        public void setVersion(String version) {
            this.version = version;
        }

        public String getTitle() {
            return title;
        }

        public void setTitle(String title) {
            this.title = title;
        }

        public String getDescription() {
            return description;
        }

        public void setDescription(String description) {
            this.description = description;
        }

        public String getContactName() {
            return contactName;
        }

        public void setContactName(String contactName) {
            this.contactName = contactName;
        }

        public String getContactUrl() {
            return contactUrl;
        }

        public void setContactUrl(String contactUrl) {
            this.contactUrl = contactUrl;
        }

        public String getContactEmail() {
            return contactEmail;
        }



        public void setContactEmail(String contactEmail) {
            this.contactEmail = contactEmail;
        }


        public void setHost(String host){
            this.host = host;
        }

        public String getHost(){
            return this.host;
        }

        public void setPath(String path){
            this.path = path;
        }

        public String getPath(){
            return this.path;
        }
    }
}

