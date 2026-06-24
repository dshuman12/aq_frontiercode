package com.gap.gid.security.adapter;

import com.gap.gid.security.dto.BluefinTokenDTO;
import com.gap.gid.security.dto.DeTokenizeRequestDTO;
import com.gap.gid.security.exception.BluefinException;
import com.gap.gid.security.exception.BluefinTimeoutException;
import com.gap.gid.security.model.DataType;

import java.util.List;

public interface BluefinAdapter {
    BluefinTokenDTO tokenize(String data, DataType dataType) throws BluefinException, BluefinTimeoutException;

    List<BluefinTokenDTO> tokenize(List<String> data, DataType dataType) throws BluefinException, BluefinTimeoutException;

    String deTokenize(DeTokenizeRequestDTO detokenizeRequestDto, DataType dataType) throws BluefinException, BluefinTimeoutException;

    List<String> deTokenize(List<DeTokenizeRequestDTO> deTokenizeRequestDtos, DataType dataType) throws BluefinException, BluefinTimeoutException;
}
