package com.gap.gid.security.client;

import com.gap.gid.security.exception.BluefinTimeoutException;
import com.gap.gid.security.model.TokenizeResponseData;
import com.gap.gid.security.dto.DeTokenizeRequestDTO;
import com.gap.gid.security.exception.BluefinException;

import java.util.List;

public interface BluefinClient {

    TokenizeResponseData tokenize(String data) throws BluefinException, BluefinTimeoutException;

    List<TokenizeResponseData> tokenize(List<String> data) throws BluefinException, BluefinTimeoutException;

    String deTokenize(DeTokenizeRequestDTO deTokenizeRequestDTO) throws BluefinException, BluefinTimeoutException;

    List<String> deTokenize(List<DeTokenizeRequestDTO> deTokenizeRequestDTO) throws BluefinException, BluefinTimeoutException;

}
