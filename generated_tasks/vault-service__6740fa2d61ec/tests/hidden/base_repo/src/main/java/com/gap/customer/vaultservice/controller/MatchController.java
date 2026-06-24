package com.gap.customer.vaultservice.controller;

import com.gap.customer.vaultservice.error.ErrorEntity;
import com.gap.customer.vaultservice.models.MatchRequest;
import com.gap.customer.vaultservice.models.MatchResponse;
import com.gap.customer.vaultservice.services.MatchService;
import com.gap.customer.vaultservice.util.VaultConstants;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.Parameters;
import io.swagger.v3.oas.annotations.enums.ParameterIn;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.HashMap;
import java.util.Map;
import javax.servlet.http.HttpServletRequest;
import javax.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequestMapping(value = "/", produces = {MediaType.APPLICATION_JSON_VALUE,
        MediaType.APPLICATION_XML_VALUE}, consumes = {MediaType.APPLICATION_JSON_VALUE,
        MediaType.APPLICATION_XML_VALUE})
@Tag(name = "Vault Entries Service")
@RequiredArgsConstructor
public class MatchController {

    private final MatchService matchService;


    @Parameters({
            @Parameter(name = "Content-Type", schema = @Schema(description = "content type", type = "string", allowableValues = {"application/json"}), required = true, in = ParameterIn.HEADER),
            @Parameter(name = "Authorization", schema = @Schema(description = "api token is required as [Bearer TOKEN VALUE]", type = "string"), required = true, in = ParameterIn.HEADER),
            @Parameter(name = "previewType", schema = @Schema(description = "this header is required if environment is preview type is [app/wip/APP/WIP]", type = "string"), in = ParameterIn.HEADER),})
    @Operation(description = "match data for vault ids", summary = "match")
    @ApiResponses(value = {@ApiResponse(responseCode = "200", description = "return a boolean.", content = @Content(schema = @Schema(implementation = MatchResponse.class))),
            @ApiResponse(responseCode = "400", description = "\t\n" +
                    "Some types are invalid. (errorCode 3)\n" +
                    "Vault Id, type or plaintext is missing. (errorCode 3)\n" +
                    "Invalid vault id length - length of vault id is 32. (errorcode 5)\n" +
                    "Some vault ids are invalid. Only alphanumerics are allowed. (errorcode 9)\n",
                    content = @Content(schema = @Schema(implementation = ErrorEntity.class))),
            @ApiResponse(responseCode = "500", description = "Internal server error. (errorCode 0)", content = @Content(schema = @Schema(implementation = ErrorEntity.class)))})
    @PostMapping(value = "match", consumes = "application/json", produces = "application/json")
    public ResponseEntity<MatchResponse> match(@Valid @RequestBody MatchRequest matchRequest, HttpServletRequest request) throws Exception {
        Long startTime = System.currentTimeMillis();
        try {
            Map<String, String> headers = getHeadersFromRequest(request);
            if (log.isDebugEnabled()) {
                log.info("Received request to match for vault id , app-name : {}", headers.get(VaultConstants.X_APP_NAME_HEADER));
            }
            ResponseEntity<MatchResponse> result = matchService.match(matchRequest, headers);
            return result;
        } catch (Exception exception) {
            log.error(MatchRequest.toMaskedString(matchRequest), exception);
            throw exception;
        } finally {
            Long endTime = System.currentTimeMillis();
            Long totalTime = endTime - startTime;
            if (totalTime > VaultServiceController.CONTROLLER_TIMEOUT_TIMER) {
                log.info("Time taken for match: " + totalTime + " with thread id: " + Thread.currentThread().getId());
            }
        }
    }

    private Map<String, String> getHeadersFromRequest(HttpServletRequest request) {

        Map<String, String> headers = new HashMap<>();
        if (request.getRemoteAddr() != null) {
            headers.put(TraceHeaders.X_FORWARDED_FOR, request.getRemoteAddr());
        }
        if (request.getHeader(TraceHeaders.X_GID_CLIENT_SESSION) != null) {
            headers.put(TraceHeaders.X_GID_CLIENT_SESSION, request.getHeader(TraceHeaders.X_GID_CLIENT_SESSION));
        }
        if (request.getHeader(TraceHeaders.X_APP_NAME) != null) {
            headers.put(TraceHeaders.X_APP_NAME, request.getHeader(TraceHeaders.X_APP_NAME));
        }
        if (request.getHeader(TraceHeaders.X_PREVIEW_HEADER) != null) {
            headers.put(TraceHeaders.X_PREVIEW_HEADER, request.getHeader(TraceHeaders.X_PREVIEW_HEADER));
        }
        return headers;
    }
}
