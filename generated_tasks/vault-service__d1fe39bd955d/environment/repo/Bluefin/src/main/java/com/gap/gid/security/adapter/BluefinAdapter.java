package com.gap.gid.security.adapter;

import com.gap.gid.security.dto.BluefinTokenDTO;
import com.gap.gid.security.dto.DeTokenizeRequestDTO;
import com.gap.gid.security.exception.BluefinException;
import com.gap.gid.security.exception.BluefinTimeoutException;

import java.util.List;

public interface BluefinAdapter {

    BluefinTokenDTO tokenize(String data) throws BluefinException, BluefinTimeoutException;

    List<BluefinTokenDTO> tokenize(List<String> data) throws BluefinException, BluefinTimeoutException;

    String deTokenize(DeTokenizeRequestDTO detokenizeRequestDto) throws BluefinException, BluefinTimeoutException;

    List<String> deTokenize(List<DeTokenizeRequestDTO> deTokenizeRequestDtos) throws BluefinException, BluefinTimeoutException;
}
