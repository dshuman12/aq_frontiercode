package com.gap.customer.vaultservice.services.Impl;

import com.gap.customer.vaultservice.dao.DAOFacade;
import com.gap.customer.vaultservice.dto.TokenDataDTO;
import com.gap.customer.vaultservice.error.ErrorCodes;
import com.gap.customer.vaultservice.error.ErrorEntityCodes;
import com.gap.customer.vaultservice.exception.DataNotFoundException;
import com.gap.customer.vaultservice.exception.VaultServiceException;
import com.gap.customer.vaultservice.models.Token;
import com.gap.customer.vaultservice.models.VaultFeatureToggle;
import com.gap.customer.vaultservice.models.VaultID;
import com.gap.gid.security.adapter.BluefinAdapter;
import com.gap.gid.security.adapter.dto.TokenDTO;
import com.gap.gid.security.adapter.voltage.VoltageClient;
import com.gap.gid.security.adapter.voltage.VoltageServiceAdapter;
import com.gap.gid.security.dto.BluefinTokenDTO;
import com.gap.gid.security.dto.DeTokenizeRequestDTO;
import com.gap.gid.security.exception.BluefinException;
import com.gap.gid.security.exception.BluefinTimeoutException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeoutException;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import static java.util.Arrays.asList;

@Service
@Slf4j
@RequiredArgsConstructor
public class TokenClientAdapter {

    private final DAOFacade daoFacade;
    private final BluefinAdapter bluefinAdapter;
    private final VoltageClient voltageClient;
    private final VoltageServiceAdapter voltageServiceAdapter;
    private final VaultFeatureToggle vaultFeatureToggle;

    public List<TokenDataDTO> retrieveTokensFor(String[] vaultIds, String appName) throws VaultServiceException {
        List<TokenDataDTO> tokenDataDTOS = getTokenDataDTOS(asList(vaultIds));
        addBluefinTokens(tokenDataDTOS, appName);
        return getTokenDataDTOsBasedOnBluefinFlag(tokenDataDTOS);
    }

    public List<TokenDataDTO> retrieveVaultIdsFor(List<TokenDataDTO> tokenDataDTOs, String appName) throws VaultServiceException {
        for (TokenDataDTO tokenDataDTO : tokenDataDTOs) {
            Token token = retrieveByVoltageToken(tokenDataDTO.getVoltageToken());
            if (token == null) {
                String plaintext = getPlaintextFor(tokenDataDTO.getVoltageToken());
                tokenDataDTO.setPlaintext(plaintext);
            } else {
                tokenDataDTO.setVaultId(token.getVaultId());
                updateTokenDTO(tokenDataDTO, token);
            }
        }
        addBluefinTokens(tokenDataDTOs, appName);
        return getTokenDataDTOsBasedOnBluefinFlag(tokenDataDTOs);
    }

    public List<TokenDataDTO> retrieveVaultIdsForBluefinTokens(List<TokenDataDTO> tokenDataDTOs, String appName) throws VaultServiceException {
        updateTokenDataDTOs(tokenDataDTOs);
        addVoltageTokens(tokenDataDTOs, appName);
        return getTokenDataDTOsBasedOnBluefinFlag(tokenDataDTOs);
    }

    private void updateTokenDataDTOs(List<TokenDataDTO> tokenDataDTOs) throws VaultServiceException {
        ArrayList<DeTokenizeRequestDTO> deTokenizeRequestDTOs = new ArrayList<>();
        for (TokenDataDTO tokenDataDTO : tokenDataDTOs) {
            Token token = null;
            try {
                token = daoFacade.getTokenDAOInstance().findByBluefinToken(tokenDataDTO.getBluefinToken());
            } catch (TimeoutException e) {
                throw new VaultServiceException(ErrorCodes.DB_TIMEOUT_ERROR, e);
            }

            if (token == null) {
                deTokenizeRequestDTOs.add(DeTokenizeRequestDTO.builder()
                        .token(tokenDataDTO.getBluefinToken())
                        .bfid(tokenDataDTO.getBluefinId())
                        .build());
            } else {
                tokenDataDTO.setVaultId(token.getVaultId());
                tokenDataDTO.setVoltageToken(token.getVoltageToken());
            }
        }
        if (!deTokenizeRequestDTOs.isEmpty()) {
            List<String> plaintexts = getPlaintextFromBluefin(deTokenizeRequestDTOs);
            List<TokenDataDTO> tokenDataDTOsWithoutVoltageToken = tokenDataDTOs.stream().filter(tokenDataDTO ->
                    StringUtils.isBlank(tokenDataDTO.getVoltageToken())
            ).collect(Collectors.toList());
            IntStream.range(0, plaintexts.size()).forEach(index ->
                    tokenDataDTOsWithoutVoltageToken.get(index).setPlaintext(plaintexts.get(index))
            );
        }
    }

    private void addVoltageTokens(List<TokenDataDTO> tokenDataDTOS, String appName) throws VaultServiceException {
        for (TokenDataDTO tokenDataDTO : tokenDataDTOS) {
            if (StringUtils.isNotBlank(tokenDataDTO.getPlaintext())) {
                String voltageToken = getVoltageToken(tokenDataDTO.getPlaintext());
                Token token = retrieveByVoltageToken(voltageToken);
                if (token != null) {
                    tokenDataDTO.setVaultId(token.getVaultId());
                }
                BluefinTokenDTO bluefinTokenDTO = BluefinTokenDTO.builder()
                        .token(tokenDataDTO.getBluefinToken())
                        .bfid(tokenDataDTO.getBluefinId())
                        .build();
                String vaultId = createOrUpdateToken(voltageToken, tokenDataDTO.getVaultId(), bluefinTokenDTO, appName);

                tokenDataDTO.setVoltageToken(voltageToken);
                tokenDataDTO.setVaultId(vaultId);
            }
        }
    }

    private void updateTokenDTO(TokenDataDTO tokenDataDTO, Token token) {
        if ((StringUtils.isBlank(token.getBluefinToken()) || StringUtils.isBlank(token.getBluefinId()))) {
            String plaintext = getPlaintextFor(token.getVoltageToken());
            tokenDataDTO.setPlaintext(plaintext);
        } else {
            tokenDataDTO.setBluefinInfo(token.getBluefinToken(), token.getBluefinId());
        }
    }

    private String createOrUpdateToken(String voltageToken, String vaultId, BluefinTokenDTO bluefinTokenDTO, String appName) throws VaultServiceException {
        if (StringUtils.isBlank(vaultId)) {
            return getVaultIdForTokenDAONull(voltageToken, bluefinTokenDTO, appName);
        }
        updateToken(vaultId, bluefinTokenDTO, appName);
        return vaultId;
    }

    private void addBluefinTokens(List<TokenDataDTO> tokenDataDTOS, String appName) throws VaultServiceException {
        Map<String, TokenDataDTO> plainTextToTokenDataDTO = tokenDataDTOS.stream()
                .filter(tokenDataDTO -> StringUtils.isNotBlank(tokenDataDTO.getPlaintext()))
                .collect(Collectors.toMap(TokenDataDTO::getPlaintext, tokenDataDTO -> tokenDataDTO));
        if (plainTextToTokenDataDTO.isEmpty()) return;
        List<BluefinTokenDTO> bluefinTokenDTOS = getBluefinTokens(new ArrayList<>(plainTextToTokenDataDTO.keySet()));
        for (BluefinTokenDTO bluefinTokenDTO : bluefinTokenDTOS) {
            TokenDataDTO tokenDataDTO = plainTextToTokenDataDTO.get(bluefinTokenDTO.getInputValue());
            tokenDataDTO.setBluefinInfo(bluefinTokenDTO.getToken(), bluefinTokenDTO.getBfid());
            String vaultId = createOrUpdateToken(tokenDataDTO.getVoltageToken(), tokenDataDTO.getVaultId(), bluefinTokenDTO, appName);

            tokenDataDTO.setVaultId(vaultId);
        }
    }

    private void processWithoutBluefinToken(List<TokenDataDTO> tokenDataDTOS, String appName) throws VaultServiceException {
        BluefinTokenDTO bluefinTokenDTO = BluefinTokenDTO.builder().token(null).bfid(null).inputValue(null).build();
        for (TokenDataDTO tokenDataDTO : tokenDataDTOS) {
            if (StringUtils.isBlank(tokenDataDTO.getVaultId())) {
                String vaultId = getVaultIdForTokenDAONull(tokenDataDTO.getVoltageToken(), bluefinTokenDTO, appName);
                tokenDataDTO.setVaultId(vaultId);
            }
        }
    }

    private List<TokenDataDTO> getTokenDataDTOS(List<String> vaultIds) {
        return vaultIds.stream().map(vaultId -> {
            TokenDataDTO tokenDataDTO = TokenDataDTO.builder().vaultId(vaultId).build();
            try {
                Token token = retrieveByVaultId(vaultId);
                tokenDataDTO.setVoltageToken(token.getVoltageToken());
                updateTokenDTO(tokenDataDTO, token);
                return tokenDataDTO;
            } catch (VaultServiceException exception) {
                log.error("Could not find token for given vault id : " + vaultId);
                return tokenDataDTO;
            }
        }).collect(Collectors.toList());
    }

    public List<TokenDataDTO> store(List<String> creditCardNumbers, String appName) throws VaultServiceException {
        var tokenDataDTOS = new ArrayList<TokenDataDTO>();
        List<String> voltageTokens = getVoltageTokens(creditCardNumbers);
        List<BluefinTokenDTO> bluefinTokens = getBluefinTokens(creditCardNumbers);
        int bound = bluefinTokens.size();
        for (int index = 0; index < bound; index++) {
            tokenDataDTOS.add(store(creditCardNumbers.get(index), voltageTokens.get(index), bluefinTokens.get(index), appName));

        }
        return getTokenDataDTOsBasedOnBluefinFlag(tokenDataDTOS);
    }

    private TokenDataDTO store(String creditCardNumber, String voltageToken, BluefinTokenDTO bluefinTokenDTO, String appName) throws VaultServiceException {
        String vaultId;
        String bluefinId = bluefinTokenDTO.getBfid();
        var token = retrieveByVoltageToken(voltageToken);
        if (token == null) {
            vaultId = getVaultIdForTokenDAONull(voltageToken, bluefinTokenDTO, appName);
        } else {
            vaultId = token.getVaultId();
            if (StringUtils.isBlank(token.getBluefinToken()) || StringUtils.isBlank(token.getBluefinId())) {
                updateToken(token.getVaultId(), bluefinTokenDTO, appName);
            } else {
                bluefinId = token.getBluefinId();
            }
        }
        return TokenDataDTO.builder()
                .voltageToken(voltageToken)
                .bluefinToken(bluefinTokenDTO.getToken())
                .bluefinId(bluefinId)
                .vaultId(vaultId)
                .plaintext(creditCardNumber)
                .build();
    }

    private String getVaultIdForTokenDAONull(String token, BluefinTokenDTO bluefinTokenDTO, String appName) throws VaultServiceException {
        TokenDTO voltageTokenDTO = new TokenDTO();
        voltageTokenDTO.setToken(token);
        voltageTokenDTO.setFormat(voltageServiceAdapter.getFormat());
        return createVaultIdForTokenNull(voltageTokenDTO, bluefinTokenDTO, appName);

    }

    protected String getVoltageToken(String creditCardNumber) {
        var token = voltageClient.tokenize(creditCardNumber);
        if (log.isDebugEnabled()) {
            log.info("The tokenized voltage token for the card : " + token);
        }
        return token;
    }

    private List<String> getVoltageTokens(List<String> requestData) {
        List<String> voltageTokens = new ArrayList<>();
        requestData.stream().forEach(creditCardNumber -> voltageTokens.add(voltageClient.tokenize(creditCardNumber)));
        return voltageTokens;
    }

    private List<BluefinTokenDTO> getBluefinTokens(List<String> creditCardNumbers) throws VaultServiceException {
        try {
            if (creditCardNumbers.size() == 1) {
                return asList(bluefinAdapter.tokenize(creditCardNumbers.get(0)));
            } else {

                return bluefinAdapter.tokenize(creditCardNumbers);
            }
        } catch (BluefinException exception) {
            log.error("Bluefin tokenize exception occurred");
            if (!vaultFeatureToggle.isBluefinEnabled()) {
                return getEmptyBluefinRecordsOf(creditCardNumbers);
            }
            throw new VaultServiceException(ErrorEntityCodes.BLUEFIN_TOKENIZE_EXECPTION, exception);
        } catch (BluefinTimeoutException exception) {
            log.error("Bluefin tokenize timeout exception occurred");
            if (!vaultFeatureToggle.isBluefinEnabled()) {
                return getEmptyBluefinRecordsOf(creditCardNumbers);
            }
            throw new VaultServiceException(ErrorEntityCodes.BLUEFIN_TIMEOUT_EXECPTION, exception);
        }
    }

    private List<BluefinTokenDTO> getEmptyBluefinRecordsOf(List<String> creditCardNumbers) {
        return creditCardNumbers.stream().map(creditCardNumber ->
                BluefinTokenDTO.builder().token(null).bfid(null).inputValue(creditCardNumber).build()).collect(Collectors.toList());
    }

    private Token retrieveByVaultId(String vaultId) throws VaultServiceException {
        Token token;

        try {
            token = daoFacade.getTokenDAOInstance().findByVaultId(vaultId);
        } catch (TimeoutException timeoutException) {
            throw new VaultServiceException(ErrorCodes.DB_TIMEOUT_ERROR, timeoutException);
        }

        if (token == null) {
            log.error("Could not find token for the vaultId : " + vaultId);
            throw new DataNotFoundException("Could not find token for the vaultId " + vaultId);
        }
        return token;
    }

    private List<String> getPlaintextFromBluefin(List<DeTokenizeRequestDTO> deTokenizeRequestDTOS) throws VaultServiceException {
        try {
            if (deTokenizeRequestDTOS.size() == 1) {
                return List.of(bluefinAdapter.deTokenize(deTokenizeRequestDTOS.get(0)));
            } else {
                return bluefinAdapter.deTokenize(deTokenizeRequestDTOS);
            }
        } catch (BluefinException exception) {
            throw new VaultServiceException(ErrorEntityCodes.BLUEFIN_DETOKENIZE_EXECPTION, exception);
        } catch (BluefinTimeoutException exception) {
            throw new VaultServiceException(ErrorEntityCodes.BLUEFIN_TIMEOUT_EXECPTION, exception);
        }
    }

    private String createVaultIdForTokenNull(TokenDTO tokenDTO, BluefinTokenDTO bluefinTokenDTO, String appName) throws VaultServiceException {
        var vaultID = new VaultID();
        persistToken(buildTokenDAO(tokenDTO, bluefinTokenDTO, vaultID.getId(), appName));
        Token token = null;
        try {
            token = daoFacade.getTokenDAOInstance().findByVaultId(vaultID.getId());
        } catch (TimeoutException timeoutException) {
            throw new VaultServiceException(ErrorCodes.DB_TIMEOUT_ERROR, timeoutException);
        }
        if (log.isDebugEnabled()) {
            log.info("The vault ID found after persist : " + token.getVaultId());
        }
        return token.getVaultId();
    }

    //TODO: to be implemented
    private String getPlaintextFor(String data) {
        var tokenDTO = new TokenDTO();
        tokenDTO.setToken(data);
        tokenDTO.setFormat(voltageServiceAdapter.getFormat());
        return voltageClient.deTokenize(tokenDTO);
    }

    private Token buildTokenDAO(TokenDTO tokenDTO, BluefinTokenDTO bluefinTokenDTO, String vaultId, String appName) {
        Date currentDateAndTime = new Date();
        return Token.builder()
                .voltageToken(tokenDTO.getToken())
                .vaultId(vaultId)
                .tokenFormatText(tokenDTO.getFormat())
                .createdByUserId(StringUtils.isBlank(appName) ? "UNAUTHENTICATED" : appName)
                .lastUpdatedByUserId(StringUtils.isBlank(appName) ? "UNAUTHENTICATED" : appName)
                .currentDateAndTime(currentDateAndTime)
                .lastUpdatedDateAndTime(currentDateAndTime)
                .bluefinToken(bluefinTokenDTO.getToken())
                .bluefinId(bluefinTokenDTO.getBfid())
                .build();
    }

    private Token retrieveByVoltageToken(String voltageToken) throws VaultServiceException {
        Token token;
        try {
            token = daoFacade.getTokenDAOInstance().findByVoltageToken(voltageToken);
        } catch (TimeoutException timeoutException) {
            throw new VaultServiceException(ErrorCodes.DB_TIMEOUT_ERROR, timeoutException);
        }

        if (token == null)
            if (log.isDebugEnabled()) {
                log.info("Could not find voltage token : " + voltageToken);
            }

        return token;
    }

    private void persistToken(Token token) {
        daoFacade.getTokenDAOInstance().createToken(token);
        if (log.isDebugEnabled()) {
            log.info("The vault ID for CreditCard has been persisted : " + token.getVaultId());
        }
    }

    private void updateToken(String vaultId, BluefinTokenDTO bluefinTokenDTOForCard, String appName) {
        if (!(StringUtils.isBlank(bluefinTokenDTOForCard.getToken())) || StringUtils.isBlank(bluefinTokenDTOForCard.getBfid())) {
            daoFacade.getTokenDAOInstance().updateToken(vaultId, bluefinTokenDTOForCard, appName);
            if (log.isDebugEnabled()) {
                log.info("The bluefin token for CreditCard has been updated for vaultId : " + vaultId);
            }
        }
    }

    private List<TokenDataDTO> getTokenDataDTOsBasedOnBluefinFlag(List<TokenDataDTO> tokenDataDTOS) {
        if (!vaultFeatureToggle.isBluefinEnabled()) {
            tokenDataDTOS.stream().map(tokenDataDTO -> {
                tokenDataDTO.setBluefinInfo(null, null);
                return tokenDataDTO;
            }).collect(Collectors.toList());
        }
        return tokenDataDTOS;
    }

}
