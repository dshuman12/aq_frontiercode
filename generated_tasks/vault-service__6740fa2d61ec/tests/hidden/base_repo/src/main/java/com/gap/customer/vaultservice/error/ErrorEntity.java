package com.gap.customer.vaultservice.error;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.experimental.Accessors;
import org.springframework.stereotype.Component;

@Component
@Data
@Builder
@AllArgsConstructor
@EqualsAndHashCode
@NoArgsConstructor
@Accessors(chain = true)
public class ErrorEntity {

    private String developerMessage;
    private String userMessage;
    private Integer errorCode;
    private String moreInfo;

    public void setDeveloperMessage(String message) {
        this.developerMessage = message;
    }
}
