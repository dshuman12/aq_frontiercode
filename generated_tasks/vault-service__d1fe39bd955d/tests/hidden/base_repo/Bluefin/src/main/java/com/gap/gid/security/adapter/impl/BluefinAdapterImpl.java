package com.gap.gid.security.adapter.impl;

import com.gap.gid.security.adapter.BluefinAdapter;
import com.gap.gid.security.dto.BluefinTokenDTO;
import com.gap.gid.security.client.BluefinClient;
import com.gap.gid.security.exception.BluefinTimeoutException;
import com.gap.gid.security.model.TokenizeResponseData;
import com.gap.gid.security.dto.DeTokenizeRequestDTO;
import com.gap.gid.security.exception.BluefinException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
@RequiredArgsConstructor
public class BluefinAdapterImpl implements BluefinAdapter {

    private final BluefinClient bluefinClient;

    @Override
    public BluefinTokenDTO tokenize(String data) throws BluefinException, BluefinTimeoutException {
        TokenizeResponseData tokenizeResponseData = bluefinClient.tokenize(data);
        return BluefinTokenDTO.builder()
                .bfid(tokenizeResponseData.getBfid())
                .token(tokenizeResponseData.getBluefinToken())
                .inputValue(data)
                .build();
    }

    @Override
    public List<BluefinTokenDTO> tokenize(List<String> data) throws BluefinException, BluefinTimeoutException {
        List<TokenizeResponseData> tokenizeResponseDataList = bluefinClient.tokenize(data);

        var bluefinTokenDTOs = new ArrayList<BluefinTokenDTO>();
        for (var tokenizeResponseData : tokenizeResponseDataList) {
            BluefinTokenDTO bluefinTokenDto = BluefinTokenDTO.builder()
                    .bfid(tokenizeResponseData.getBfid())
                    .token(tokenizeResponseData.getBluefinToken())
                    .inputValue(data.get(Integer.parseInt(tokenizeResponseData.getReferenceId())))
                    .build();

            bluefinTokenDTOs.add(bluefinTokenDto);
        }
        return bluefinTokenDTOs;
    }

    @Override
    public String deTokenize(DeTokenizeRequestDTO detokenizeRequestDto) throws BluefinException, BluefinTimeoutException {
        return bluefinClient.deTokenize(detokenizeRequestDto);
    }

    @Override
    public List<String> deTokenize(List<DeTokenizeRequestDTO> deTokenizeRequestDtos) throws BluefinException, BluefinTimeoutException {
        return bluefinClient.deTokenize(deTokenizeRequestDtos);
    }

}
