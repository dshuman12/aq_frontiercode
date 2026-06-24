package com.gap.gid.security.dto;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@ConfigurationProperties(prefix = "bluefin")
@Component
public class BluefinPropertiesDTO {

    private String host;
    private String partnerId;
    private String partnerKey;
    private String tokenizePath;
    private String bulkTokenizePath;
    private String deTokenizePath;
    private String bulkDeTokenizePath;
    private String reference;
    private String templateRefCreditCard;
    private String templateRefGiftCard;
}
