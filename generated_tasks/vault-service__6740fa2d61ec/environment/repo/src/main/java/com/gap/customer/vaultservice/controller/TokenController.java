package com.gap.customer.vaultservice.controller;


import com.gap.customer.vaultservice.error.ErrorEntity;
import com.gap.customer.vaultservice.models.SearchResponse;
import com.gap.customer.vaultservice.models.TokenResponse;
import com.gap.customer.vaultservice.models.TokenSearchRequest;
import com.gap.customer.vaultservice.models.VaultRequest;
import com.gap.customer.vaultservice.services.TokenService;
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
import java.util.List;
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
@Tag(name = "Vault Search Service")
@RequiredArgsConstructor
public class TokenController {

   private final TokenService tokenService;

    @Parameters({
            @Parameter(name = "Content-Type", schema = @Schema(description = "content type",type = "string", allowableValues = {"application/json"}), required = true, in = ParameterIn.HEADER),
            @Parameter(name = "Authorization", schema = @Schema(description = "api token is required as [Bearer TOKEN VALUE]", type = "string"), required = true, in = ParameterIn.HEADER),
    @Parameter(name = "previewType", schema = @Schema(description="this header is required if environment is preview type is [app/wip/APP/WIP]", type = "string"), in = ParameterIn.HEADER)})
    @Operation(description = "Manage token entries", summary = "getTokenEntries")
    @ApiResponses(value = {@ApiResponse(responseCode = "200", description = "returns array of TokenResponse objects.", content = @Content(schema = @Schema(implementation = TokenResponse.class))),
            @ApiResponse(responseCode = "400", description = "Indexes are not unique. (errorCode 1)\n" +
                    "Some types are invalid. (errorCode 2)\n" +
                    "Index, type or plaintext is missing. (errorcode 3)\n" +
                    "Invalid credit card length - maximum allowed length is 30 and minimum allowed length is 13. (errorcode 11)<br />" +
                    "Invalid credit card  - Some credit card numbers are invalid. (errorcode 5)\n", content = @Content(schema = @Schema(implementation = ErrorEntity.class))),
            @ApiResponse(responseCode = "500", description = "Internal server error. (errorCode 0)", content = @Content(schema = @Schema(implementation = ErrorEntity.class))),
            @ApiResponse(responseCode = "404", description = "Some data were not found. (errorCode 14)", content = @Content(schema = @Schema(implementation = ErrorEntity.class)))})
    @PostMapping(value = "token-entries", consumes = "application/json", produces = "application/json")
    public ResponseEntity<List<TokenResponse>> createTokenEntries(@Valid @RequestBody List<VaultRequest> vaultRequests,
                                                                  HttpServletRequest request) throws Exception {
        Long startTime = System.currentTimeMillis();
        try {
            Map<String, String> headers = getHeadersFromRequest(request);
            if (log.isDebugEnabled()) {
                log.info("Received request to create token entries , app-name : {}", headers.get(VaultConstants.X_APP_NAME_HEADER));
            }
            ResponseEntity<List<TokenResponse>> result = tokenService.createTokenEntries(vaultRequests, headers);
            return result;
        } catch (Exception exception) {
            log.error(VaultRequest.toMaskedString(vaultRequests), exception);
            throw exception;
        } finally {
            Long endTime = System.currentTimeMillis();
            Long totalTime = endTime - startTime;
            if (totalTime > VaultServiceController.CONTROLLER_TIMEOUT_TIMER) {
                log.info("Time taken for token-entries: " + totalTime + " with thread id: " + Thread.currentThread().getId());
            }
        }
    }


    @Parameters({
            @Parameter(name = "Content-Type", schema= @Schema(description = "content type", type = "string", allowableValues = {"application/json"}), required = true, in = ParameterIn.HEADER),
            @Parameter(name = "Authorization", schema = @Schema(description = "api token is required as [Bearer TOKEN VALUE]", type = "string"), required = true, in = ParameterIn.HEADER),
            @Parameter(name = "previewType", schema = @Schema(description="this header is required if environment is preview type is [app/wip/APP/WIP]", type = "string"), required = false, in = ParameterIn.HEADER)})
    @Operation(description = "retrieve Vaultid from token ", summary = "getVaultIDsByToken")
    @ApiResponses(value = {@ApiResponse(responseCode = "200", description = "returns array of VaultId objects.", content = @Content(schema = @Schema(implementation = SearchResponse.class))),
            @ApiResponse(responseCode = "400", description = "\t\n" +
                    "Indexes are not unique. (errorCode 1)\n" +
                    "Some return types are invalid. (errorCode 15)\n"+
                    "Index, ReturnType or Token is missing. (errorCode 3)\n" +
                    "Invalid token length - Maximum allowed length is 20 and Minimum allowed length is 13. (errorcode 7)\n" +
                    "Some tokens are invalid. Only digits are allowed (errorcode 16)", content = @Content(schema = @Schema(implementation = ErrorEntity.class))),
            @ApiResponse(responseCode = "500", description = "Internal server error. (errorCode 0)", content = @Content(schema = @Schema(implementation = ErrorEntity.class)))})
    @PostMapping(value = "token-entries/search", consumes = "application/json", produces = "application/json")
    public ResponseEntity<List<SearchResponse>> searchVaultIdbyToken(@Valid @RequestBody List<TokenSearchRequest> tokenSearchRequests, HttpServletRequest request) throws Exception {
        Long startTime = System.currentTimeMillis();
        try {
            Map<String, String> headers = getHeadersFromRequest(request);
            if (log.isDebugEnabled()) {
                log.info("Received request to retrieve VaultId by token entries search , app-name : {}", headers.get(VaultConstants.X_APP_NAME_HEADER));
            }
            ResponseEntity<List<SearchResponse>> result = tokenService.searchTokenEntriesByToken(tokenSearchRequests, headers);
            return result;
        } catch (Exception exception) {
            log.error(TokenSearchRequest.toMaskedString(tokenSearchRequests), exception);
            throw exception;
        } finally {
            Long endTime = System.currentTimeMillis();
            Long totalTime = endTime - startTime;
            if (totalTime > VaultServiceController.CONTROLLER_TIMEOUT_TIMER) {
                log.info("Time taken for token-entries/search: " + totalTime + " with thread id: " + Thread.currentThread().getId());
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
        if (request.getHeader(TraceHeaders.X_PREVIEW_HEADER)!= null){
            headers.put(TraceHeaders.X_PREVIEW_HEADER, request.getHeader(TraceHeaders.X_PREVIEW_HEADER));
        }

        return headers;
    }
}
