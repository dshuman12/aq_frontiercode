package com.gap.customer.vaultservice.services.Impl;

import com.gap.customer.vaultservice.dto.TokenDataDTO;
import com.gap.customer.vaultservice.exception.DataNotFoundException;
import com.gap.customer.vaultservice.exception.VaultServiceException;
import com.gap.customer.vaultservice.models.MatchRequest;
import com.gap.customer.vaultservice.models.MatchResponse;
import com.gap.customer.vaultservice.models.VaultClientRequest;
import com.gap.customer.vaultservice.models.VaultClientResponse;
import com.gap.customer.vaultservice.models.VaultClientResult;
import com.gap.customer.vaultservice.util.VaultConstants;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.stream.IntStream;

@Slf4j
@RequiredArgsConstructor
@Component
public class VaultClientResponseHelperImpl implements VaultClientResponseHelper {

    private final TokenClientAdapter tokenClientAdapter;
    private final EncryptionClientAdapter encryptionClientAdapter;
    private final PasswordClientAdapter passwordClientAdapter;

    @Override
    public VaultClientResponse createVaultIdDataForEncryptedCard(VaultClientRequest vaultClientRequest, String appName) throws VaultServiceException {
        var vaultClientResults = new ArrayList<VaultClientResult>();
        for (var inputData : vaultClientRequest.getRequestData()) {
            vaultClientResults.add(
                    VaultClientResult.builder()
                            .requestData(inputData)
                            .responseData(encryptionClientAdapter.store(inputData, vaultClientRequest.getRequestFormat(), appName))
                            .build()
            );
        }
        return VaultClientResponse.builder().result(vaultClientResults).requestFormat(vaultClientRequest.getRequestFormat()).responseFormat(vaultClientRequest.getResponseFormat()).build();
    }

    @Override
    public VaultClientResponse searchByVaultIdForEncryptedCard(VaultClientRequest vaultClientRequest) throws VaultServiceException {
        var vaultClientResults = new ArrayList<VaultClientResult>();
        for (var inputData : vaultClientRequest.getRequestData()) {
            String responseData = encryptionClientAdapter.retrieve(inputData, vaultClientRequest.getResponseFormat());
            if (!StringUtils.isEmpty(responseData))
                vaultClientResults.add(VaultClientResult.builder().requestData(inputData).responseData
                        (responseData)
                        .build());
        }
        return VaultClientResponse.builder().result(vaultClientResults).requestFormat(vaultClientRequest.getRequestFormat()).responseFormat(vaultClientRequest.getResponseFormat()).build();
    }

    @Override
    public VaultClientResponse createVaultIdDataForCreditCard(VaultClientRequest vaultClientRequest, String appName) throws VaultServiceException {
        var vaultClientResults = new ArrayList<VaultClientResult>();
        List<String> creditCardNumbers = Arrays.asList(vaultClientRequest.getRequestData());
        var tokenDataDTOs = tokenClientAdapter.store(creditCardNumbers, appName);
        IntStream.range(0, vaultClientRequest.getRequestData().length).forEach(index ->
                vaultClientResults.add(VaultClientResult.builder()
                        .requestData(vaultClientRequest.getRequestData()[index])
                        .responseData(tokenDataDTOs.get(index).getVaultId()).build()));
        return VaultClientResponse.builder()
                .result(vaultClientResults)
                .requestFormat(vaultClientRequest.getRequestFormat())
                .responseFormat(vaultClientRequest.getResponseFormat())
                .build();
    }

    @Override
    public VaultClientResponse searchByVaultIdForToken(VaultClientRequest vaultClientRequest, String appName) throws VaultServiceException {
        var vaultClientResults = new ArrayList<VaultClientResult>();
        List<TokenDataDTO> tokenDataDTOS = tokenClientAdapter.retrieveTokensFor(
                vaultClientRequest.getRequestData(),
                appName
        );
        tokenDataDTOS.forEach((TokenDataDTO tokenDataDTO) -> {
            if (tokenDataDTO.getVoltageToken() != null) {
                vaultClientResults.add(
                        VaultClientResult.builder()
                                .requestData(tokenDataDTO.getVaultId())
                                .responseData(tokenDataDTO.getVoltageToken())
                                .bluefinToken(tokenDataDTO.getBluefinToken())
                                .bluefinId(tokenDataDTO.getBluefinId())
                                .build()
                );
            }
        });
        return VaultClientResponse.builder()
                .result(vaultClientResults)
                .requestFormat(vaultClientRequest.getRequestFormat())
                .responseFormat(vaultClientRequest.getResponseFormat())
                .build();
    }

    @Override
    public VaultClientResponse createTokenEntriesForCreditCardNumber(VaultClientRequest vaultClientRequest) {
        var vaultClientResults = new ArrayList<VaultClientResult>();
        for (var inputData : vaultClientRequest.getRequestData()) {
            vaultClientResults.add(VaultClientResult.builder().requestData(inputData).responseData
                    (tokenClientAdapter.getVoltageToken(inputData))
                    .build());
        }
        return VaultClientResponse.builder().result(vaultClientResults).build();
    }

    @Override
    public VaultClientResponse createVaultIdDataForPassword(VaultClientRequest vaultClientRequest, String appName) throws VaultServiceException  {
        var vaultClientResults = new ArrayList<VaultClientResult>();
        for (var inputData : vaultClientRequest.getRequestData()) {
            vaultClientResults.add(
                    VaultClientResult.builder()
                            .requestData(inputData)
                            .responseData(passwordClientAdapter.store(inputData, vaultClientRequest.getRequestFormat(), appName))
                            .build()
            );
        }
        return VaultClientResponse.builder()
                .result(vaultClientResults)
                .requestFormat(vaultClientRequest.getRequestFormat())
                .responseFormat(vaultClientRequest.getResponseFormat())
                .build();
    }

    @Override
    public MatchResponse matchPassword(MatchRequest matchRequest) throws VaultServiceException {
        try{
            String passwordForVaultId = passwordClientAdapter.retrieve(matchRequest.getVaultId(), VaultConstants.REQ_TYPE_PASSWORD);
            return MatchResponse.builder().result(passwordForVaultId.equals(matchRequest.getPlaintext())).build();
        }
        catch(DataNotFoundException exception){
            return MatchResponse.builder().result(false).build();
        }
    }
}
