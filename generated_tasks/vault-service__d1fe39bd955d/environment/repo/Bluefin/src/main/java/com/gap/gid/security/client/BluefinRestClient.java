package com.gap.gid.security.client;

import com.gap.gid.security.dto.BluefinPropertiesDTO;
import com.gap.gid.security.dto.DeTokenizeRequestDTO;
import com.gap.gid.security.exception.BluefinException;
import com.gap.gid.security.exception.BluefinTimeoutException;
import com.gap.gid.security.model.BulkDeTokenizeRequest;
import com.gap.gid.security.model.BulkDeTokenizeResponse;
import com.gap.gid.security.model.BulkTokenizeRequest;
import com.gap.gid.security.model.BulkTokenizeResponse;
import com.gap.gid.security.model.DeTokenizeRequestData;
import com.gap.gid.security.model.DeTokenizeResponse;
import com.gap.gid.security.model.TokenizeRequestData;
import com.gap.gid.security.model.TokenizeResponse;
import com.gap.gid.security.model.TokenizeResponseData;
import com.gap.gid.security.model.Values;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.ResourceAccessException;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class BluefinRestClient implements BluefinClient {

    private static final String SCX_TOKEN_CARD_NUMBER = "scx_token_card_number";

    private final BluefinPropertiesDTO bluefinProperties;
    private final ResilientBluefinRestClient resilientBluefinRestClient;

    @Override
    public TokenizeResponseData tokenize(String data) throws BluefinException, BluefinTimeoutException {
        TokenizeRequestData tokenizeRequestData = buildTokenizeRequestData(data);
        try {
            if (log.isDebugEnabled()) {
                log.info("Calling Bluefin's tokenize service");
            }
            ResponseEntity<TokenizeResponse> response = resilientBluefinRestClient.tokenize(tokenizeRequestData);
            if (log.isDebugEnabled()) {
                log.info("Received token response from Bluefin");
            }
            if (response == null || response.getBody() == null) {
                log.error("Response from Bluefin is null");
                throw new BluefinException("Response from bluefin is null");
            }

            return TokenizeResponseData.builder()
                    .bfid(response.getBody().getBfid())
                    .bluefinToken(response.getBody().getValues().get(0).getValue())
                    .build();

        } catch (HttpServerErrorException | HttpClientErrorException exception) {
            throw new BluefinException("Call to Bluefin :: Error while fetching data from Bluefin ", exception);
        } catch (ResourceAccessException exception) {
            log.error("Call to Bluefin Tokenize:: timeout while fetching data for reference id: " + tokenizeRequestData.getReference());
            throw new BluefinTimeoutException("Call to Bluefin :: timeout while fetching data from Bluefin ", exception);
        }
    }

    @Override
    public List<TokenizeResponseData> tokenize(List<String> data) throws BluefinException, BluefinTimeoutException {
        BulkTokenizeRequest bulkTokenizeRequest = buildBulkTokenizeRequestData(data);
        try {
            if (log.isDebugEnabled()) {
                log.info("Calling Bluefin's bulk tokenize service");
            }
            ResponseEntity<BulkTokenizeResponse> response = resilientBluefinRestClient.bulkTokenize(bulkTokenizeRequest);
            if (log.isDebugEnabled()) {
                log.info("Received token response from Bluefin's bulk tokenize service");
            }
            if (response == null || response.getBody() == null) {
                log.error("Response from bluefin is null");
                throw new BluefinException("Response from bluefin is null");
            }
            return buildBulkTokenizeResponseData(response.getBody());

        } catch (HttpServerErrorException | HttpClientErrorException exception) {
            throw new BluefinException("Call to Bluefin :: Error while fetching data from bluefin ", exception);
        } catch (ResourceAccessException exception) {
            log.error("Call to Bluefin Bulk Tokenize :: timeout while fetching data for reference Id: {}", bulkTokenizeRequest.getReference());
            throw new BluefinTimeoutException("Call to Bluefin :: timeout while fetching data from Bluefin ", exception);
        }
    }

    @Override
    public String deTokenize(DeTokenizeRequestDTO deTokenizeRequestDto) throws BluefinException, BluefinTimeoutException {
        DeTokenizeRequestData detokenizeRequestData = buildDeTokenizeRequestData(deTokenizeRequestDto);
        try {
            if (log.isDebugEnabled()) {
                log.info("Calling Bluefin's deTokenize service");
            }
            ResponseEntity<DeTokenizeResponse> response = resilientBluefinRestClient.deTokenize(detokenizeRequestData);
            if (log.isDebugEnabled()) {
                log.info("Received plaintext response from Bluefin");
            }
            if (response == null || response.getBody() == null) {
                log.error("Response from Bluefin is null");
                throw new BluefinException("Response from bluefin is null");
            }

            return response.getBody().getValues().get(0).getValue();

        } catch (HttpServerErrorException | HttpClientErrorException exception) {
            throw new BluefinException("Call to Bluefin :: Error while fetching data from Bluefin ", exception);
        } catch (ResourceAccessException exception) {
            log.error("Call to Bluefin Detokenize :: timeout while fetching data for referenceId: {}", detokenizeRequestData.getReference());
            throw new BluefinTimeoutException("Call to Bluefin :: timeout while fetching data from Bluefin ", exception);
        }
    }

    public List<String> deTokenize(List<DeTokenizeRequestDTO> deTokenizeRequestDtos) throws BluefinException, BluefinTimeoutException {
        BulkDeTokenizeRequest bulkDetokenizeRequest = buildBulkDeTokenizeRequestData(deTokenizeRequestDtos);
        try {
            if (log.isDebugEnabled()) {
                log.info("Calling Bluefin's bulk deTokenize service");
            }
            ResponseEntity<BulkDeTokenizeResponse> response = resilientBluefinRestClient.bulkDetokenize(bulkDetokenizeRequest);
            if (log.isDebugEnabled()) {
                log.info("Received plaintext response from Bluefin's bulk deTokenize service");
            }
            if (response == null || response.getBody() == null) {
                log.error("Response from Bluefin is null");
                throw new BluefinException("Response from bluefin is null");
            }

            return buildBulkDeTokenizeResponseData(response.getBody());

        } catch (HttpServerErrorException | HttpClientErrorException exception) {
            throw new BluefinException("Call to Bluefin :: Error while fetching data from Bluefin ", exception);
        } catch (ResourceAccessException exception) {
            log.error("Call to Bluefin BulkDetokenize :: timeout while fetching data for referenceId: {}" + bulkDetokenizeRequest.getReference());
            throw new BluefinTimeoutException("Call to Bluefin :: timeout while fetching data from Bluefin ", exception);
        }
    }

    private List<TokenizeResponseData> buildBulkTokenizeResponseData(BulkTokenizeResponse response) {
        List<TokenizeResponse> tokenizeResponses = sortBulkTokenizeResponseByReference(response.getBatches());
        var bulkTokenizeResponseData = new ArrayList<TokenizeResponseData>();

        for (var tokenizeResponse : tokenizeResponses) {
            TokenizeResponseData tokenizeResponseData = TokenizeResponseData.builder()
                    .referenceId(tokenizeResponse.getReference())
                    .bfid(tokenizeResponse.getBfid())
                    .bluefinToken(tokenizeResponse.getValues().get(0).getValue()).build();

            bulkTokenizeResponseData.add(tokenizeResponseData);
        }
        return bulkTokenizeResponseData;
    }

    private BulkTokenizeRequest buildBulkTokenizeRequestData(List<String> inputData) {
        var bulkTokenizeRequestData = new ArrayList<TokenizeRequestData>();
        int referenceNumber = 0;
        for (var data : inputData) {
            Values values = Values.builder().value(data).name(SCX_TOKEN_CARD_NUMBER).build();
            TokenizeRequestData tokenizeRequestData = TokenizeRequestData.builder()
                    .reference(String.valueOf(referenceNumber))
                    .values(Arrays.asList(values)).build();
            bulkTokenizeRequestData.add(tokenizeRequestData);
            referenceNumber++;
        }
        return BulkTokenizeRequest.builder()
                .reference(generateReference())
                .templateRef(bluefinProperties.getTemplateRef())
                .batches(bulkTokenizeRequestData)
                .build();
    }

    private TokenizeRequestData buildTokenizeRequestData(String data) {
        Values values = Values.builder().name(SCX_TOKEN_CARD_NUMBER).value(data).build();
        return TokenizeRequestData.builder()
                .reference(generateReference())
                .templateRef(bluefinProperties.getTemplateRef())
                .values(Arrays.asList(values))
                .build();
    }

    private DeTokenizeRequestData buildDeTokenizeRequestData(DeTokenizeRequestDTO deTokenizeRequestDTO) {
        Values values = Values.builder()
                .name(SCX_TOKEN_CARD_NUMBER)
                .value(deTokenizeRequestDTO.getToken())
                .build();

        return DeTokenizeRequestData.builder()
                .reference(generateReference())
                .bfid(deTokenizeRequestDTO.getBfid())
                .values(Arrays.asList(values)).build();
    }

    private List<String> buildBulkDeTokenizeResponseData(BulkDeTokenizeResponse response) {
        List<DeTokenizeResponse> deTokenizeResponses = sortBulkDeTokenizeResponseByReference(response.getBatches());
        var bulkDetokenizeResponseData = new ArrayList<String>();

        for (var deTokenizeResponse : deTokenizeResponses) {
            bulkDetokenizeResponseData.add(deTokenizeResponse.getValues().get(0).getValue());
        }
        return bulkDetokenizeResponseData;
    }

    private BulkDeTokenizeRequest buildBulkDeTokenizeRequestData(List<DeTokenizeRequestDTO> deTokenizeRequestDtos) {
        var bulkDeTokenizeRequestData = new ArrayList<DeTokenizeRequestData>();
        int referenceNumber = 0;
        for (var deTokenizeRequestDto : deTokenizeRequestDtos) {
            Values values = Values.builder()
                    .value(deTokenizeRequestDto.getToken())
                    .name(SCX_TOKEN_CARD_NUMBER).build();
            DeTokenizeRequestData deTokenizeRequestData = DeTokenizeRequestData.builder()
                    .reference(String.valueOf(referenceNumber))
                    .bfid(deTokenizeRequestDto.getBfid())
                    .values(Arrays.asList(values)).build();
            bulkDeTokenizeRequestData.add(deTokenizeRequestData);
            referenceNumber++;
        }
        return BulkDeTokenizeRequest.builder()
                .reference(generateReference())
                .batches(bulkDeTokenizeRequestData)
                .build();
    }

    private List<TokenizeResponse> sortBulkTokenizeResponseByReference(List<TokenizeResponse> batches) {
        batches.sort(Comparator.comparing(TokenizeResponse::getReference));
        return batches;
    }

    private List<DeTokenizeResponse> sortBulkDeTokenizeResponseByReference(List<DeTokenizeResponse> batches) {
        batches.sort(Comparator.comparing(DeTokenizeResponse::getReference));
        return batches;
    }

    private String generateReference() {
        return UUID.randomUUID().toString();
    }
}
