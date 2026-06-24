package com.gap.gid.security.client;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.gap.gid.security.client.hmac.HmacDataContainer;
import com.gap.gid.security.client.hmac.HmacUtil;
import com.gap.gid.security.dto.BluefinPropertiesDTO;
import com.gap.gid.security.exception.BluefinException;
import com.gap.gid.security.model.BulkDeTokenizeRequest;
import com.gap.gid.security.model.BulkDeTokenizeResponse;
import com.gap.gid.security.model.BulkTokenizeRequest;
import com.gap.gid.security.model.BulkTokenizeResponse;
import com.gap.gid.security.model.DeTokenizeRequestData;
import com.gap.gid.security.model.DeTokenizeResponse;
import com.gap.gid.security.model.TokenizeRequestData;
import com.gap.gid.security.model.TokenizeResponse;
import io.github.resilience4j.retry.RetryRegistry;
import io.github.resilience4j.retry.annotation.Retry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import javax.annotation.PostConstruct;

@Slf4j
@Component
@RequiredArgsConstructor
public class ResilientBluefinRestClient {

    @Autowired
    private RetryRegistry registry;
    @Autowired
    private RestTemplate restTemplateTokenize;
    @Autowired
    private RestTemplate restTemplateBulkTokenize;
    @Autowired
    private RestTemplate restTemplateDetokenize;
    @Autowired
    private RestTemplate restTemplateBulkDetokenize;
    private final BluefinPropertiesDTO bluefinProperties;
    private final ObjectMapper objectMapper;
    private static final  Integer TOKEN_TIMEOUT_TIMER = 1500;

    @Retry(name = "bluefin-client-tokenize")
    public ResponseEntity<TokenizeResponse> tokenize(TokenizeRequestData tokenizeRequestData) throws BluefinException {
        Long startTime = System.currentTimeMillis();
        try {
            String tokenizePath = bluefinProperties.getTokenizePath();
            String url = bluefinProperties.getHost() + tokenizePath;
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            String hmacAuth = getHmacAuthForTokenize(tokenizeRequestData, tokenizePath);
            if (log.isDebugEnabled()) {
                log.info("The bluefin Hmac authorization for tokenize::::" + hmacAuth);
            }
            headers.set("Authorization", hmacAuth);
            HttpEntity<TokenizeRequestData> request = new HttpEntity<>(tokenizeRequestData, headers);

            startTime = System.currentTimeMillis();
            ResponseEntity<TokenizeResponse> response = restTemplateTokenize.exchange(
                    url, HttpMethod.POST, request, new ParameterizedTypeReference<>() {
                    });
            return response;
        } finally {
            Long endTime = System.currentTimeMillis();
            Long totalTime = endTime - startTime;
            if (totalTime > TOKEN_TIMEOUT_TIMER) {
                log.info("Time taken for Bluefin Tokenization : " + totalTime + " with thread id: "
                        + Thread.currentThread().getId()+" with Bluefin reference: "+tokenizeRequestData.getReference());
            }
        }
    }

    @Retry(name = "bluefin-client-tokenize")
    public ResponseEntity<BulkTokenizeResponse> bulkTokenize(BulkTokenizeRequest bulkTokenizeRequest) throws BluefinException {
        Long startTime = System.currentTimeMillis();
        try {
            String bulkTokenizePath = bluefinProperties.getBulkTokenizePath();
            String url = bluefinProperties.getHost() + bulkTokenizePath;
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Authorization", getHmacAuthForBulkTokenize(bulkTokenizeRequest, bulkTokenizePath));
            HttpEntity<BulkTokenizeRequest> request = new HttpEntity<>(bulkTokenizeRequest, headers);

            startTime = System.currentTimeMillis();
            ResponseEntity<BulkTokenizeResponse> response = restTemplateBulkTokenize.exchange(
                    url, HttpMethod.POST, request, new ParameterizedTypeReference<>() {
                    });
            return response;
        } finally {
            Long endTime = System.currentTimeMillis();
            Long totalTime = endTime - startTime;
            if (totalTime > TOKEN_TIMEOUT_TIMER) {
                log.info("Time taken for Bluefin bulk Tokenization : " + totalTime + " with thread id: "
                        + Thread.currentThread().getId()+" with Bluefin reference: "+bulkTokenizeRequest.getReference());
            }
        }
    }

    @Retry(name = "bluefin-client-detokenize")
    public ResponseEntity<DeTokenizeResponse> deTokenize(DeTokenizeRequestData detokenizeRequestData) throws BluefinException {
        Long startTime = System.currentTimeMillis();
        try {
            String deTokenizePath = bluefinProperties.getDeTokenizePath();
            String url = bluefinProperties.getHost() + deTokenizePath;
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Authorization", getHmacAuthForDeTokenize(detokenizeRequestData, deTokenizePath));
            HttpEntity<DeTokenizeRequestData> bluefinDeTokenizeRequest = new HttpEntity<>(detokenizeRequestData, headers);

            startTime = System.currentTimeMillis();
            ResponseEntity<DeTokenizeResponse> response = restTemplateDetokenize.exchange(
                    url, HttpMethod.POST, bluefinDeTokenizeRequest, new ParameterizedTypeReference<>() {
                    });
            return response;
        } finally {
            Long endTime = System.currentTimeMillis();
            Long totalTime = endTime - startTime;
            if (totalTime > TOKEN_TIMEOUT_TIMER) {
                log.info("Time taken for Bluefin deTokenization : " + totalTime + " with thread id: "
                        + Thread.currentThread().getId()+" with Bluefin reference: "+detokenizeRequestData.getReference());
            }
        }
    }

    @Retry(name = "bluefin-client-detokenize")
    public ResponseEntity<BulkDeTokenizeResponse> bulkDetokenize(BulkDeTokenizeRequest bulkDetokenizeRequest) throws BluefinException {
        Long startTime = System.currentTimeMillis();
        try {
            String bulkDeTokenizePath = bluefinProperties.getBulkDeTokenizePath();
            String url = bluefinProperties.getHost() + bulkDeTokenizePath;
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Authorization", getHmacAuthForBulkDeTokenize(bulkDetokenizeRequest, bulkDeTokenizePath));
            HttpEntity<BulkDeTokenizeRequest> request = new HttpEntity<>(bulkDetokenizeRequest, headers);
            startTime = System.currentTimeMillis();
            ResponseEntity<BulkDeTokenizeResponse> response = restTemplateBulkDetokenize.exchange(
                    url, HttpMethod.POST, request, new ParameterizedTypeReference<>() {
                    });
            return response;
        } finally {
            Long endTime = System.currentTimeMillis();
            Long totalTime = endTime - startTime;
            if (totalTime > TOKEN_TIMEOUT_TIMER) {
                log.info("Time taken for Bluefin bulk deTokenization : " + totalTime + " with thread id: "
                        + Thread.currentThread().getId()+" with Bluefin reference: "+bulkDetokenizeRequest.getReference());
            }
        }
    }

    private String getHmacAuthForTokenize(TokenizeRequestData tokenizeRequestData, String resource) throws BluefinException {
        String requestDataAsString;
        try {
            requestDataAsString = objectMapper.writeValueAsString(tokenizeRequestData);
        } catch (JsonProcessingException exception) {
            log.error("Error occurs while converting request object to string");
            throw new BluefinException(exception);
        }
        return getHmacAuth(resource, requestDataAsString);
    }

    private String getHmacAuthForDeTokenize(DeTokenizeRequestData detokenizeRequestData, String resource) throws BluefinException {
        String requestDataAsString;
        try {
            requestDataAsString = objectMapper.writeValueAsString(detokenizeRequestData);
        } catch (JsonProcessingException exception) {
            log.error("Error occurs while converting request object to string");
            throw new BluefinException(exception);
        }
        return getHmacAuth(resource, requestDataAsString);
    }

    private String getHmacAuthForBulkTokenize(BulkTokenizeRequest tokenizeRequestData, String resource) throws BluefinException {
        String requestDataAsString;
        try {
            requestDataAsString = objectMapper.writeValueAsString(tokenizeRequestData);
        } catch (JsonProcessingException exception) {
            log.error("Error occurs while converting request object to string");
            throw new BluefinException(exception);
        }
        return getHmacAuth(resource, requestDataAsString);
    }

    private String getHmacAuthForBulkDeTokenize(BulkDeTokenizeRequest bulkDetokenizeRequest, String resource) throws BluefinException {
        String requestDataAsString;
        try {
            requestDataAsString = objectMapper.writeValueAsString(bulkDetokenizeRequest);
        } catch (JsonProcessingException exception) {
            log.error("Error occurs while converting request object to string");
            throw new BluefinException(exception);
        }
        return getHmacAuth(resource, requestDataAsString);
    }

    private String getHmacAuth(String resource, String requestDataAsString) {
        String contentHash = HmacUtil.makeSha256Hash(requestDataAsString);
        String nonce = HmacUtil.getNonce();
        long timeStamp = HmacUtil.getTimestamp();
        HmacDataContainer hmacDataContainer = HmacDataContainer.builder()
                .httpVerb("POST")
                .canonicalizedResource(resource)
                .nonce(nonce)
                .timestamp(timeStamp)
                .contentHash(contentHash)
                .build();
        String hmacSHA256Hash = HmacUtil.generateResponseHmac(hmacDataContainer, bluefinProperties.getPartnerKey());

        return HmacUtil.hmacAuthHeader(bluefinProperties.getPartnerId(), nonce, timeStamp, hmacSHA256Hash);
    }

    @PostConstruct
    public void postConstruct() {
        registry.retry("bluefin-client-tokenize")
                .getEventPublisher()
                .onRetry(event -> log.info(event.toString()));
        registry.retry("bluefin-client-detokenize")
                .getEventPublisher()
                .onRetry(event -> log.info(event.toString()));
    }
}

