package com.gap.gid.security.adapter.voltage;

import com.gap.gid.security.adapter.ServiceAdapter;
import com.gap.gid.security.adapter.dto.TokenDTO;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;

/**
 * Adapter implementation for the Voltage services.
 *
 * @author Hallisson Santos
 *
 */
public class VoltageServiceAdapter implements ServiceAdapter {

    private VoltageClient client;

    public VoltageServiceAdapter(VoltageClient client){
        this.client = client;
    }

    @Override
    public TokenDTO tokenize(String creditCard) {
        String token = client.tokenize(creditCard);
        TokenDTO dto = new TokenDTO(token);
        dto.setInputValue(creditCard);
        return dto;
    }

    @Override
    public String deTokenize(TokenDTO token) {
        return client.deTokenize(token);
    }

    @Override
    public String getFormat() {
        return client.getProperties().getFormat();
    }

    @Override
    public List<String> tokenize(List<String> data) {
        return client.tokenize(data);
    }

    @Override
    public List<String> deTokenize(List<String> data) {
        return client.deTokenize(data);
    }
}
