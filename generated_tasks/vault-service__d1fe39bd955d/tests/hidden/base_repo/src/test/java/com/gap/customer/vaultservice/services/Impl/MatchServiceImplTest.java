package com.gap.customer.vaultservice.services.Impl;

import com.gap.customer.vaultservice.Validators.MatchServiceValidator;
import com.gap.customer.vaultservice.controller.TraceHeaders;
import com.gap.customer.vaultservice.error.ErrorCodes;
import com.gap.customer.vaultservice.error.ErrorEntity;
import com.gap.customer.vaultservice.error.ErrorEntityInternal;
import com.gap.customer.vaultservice.error.ErrorEntityMessage;
import com.gap.customer.vaultservice.exception.ValidationException;
import com.gap.customer.vaultservice.exception.VaultServiceException;
import com.gap.customer.vaultservice.models.MatchRequest;
import com.gap.customer.vaultservice.models.MatchResponse;
import com.gap.customer.vaultservice.models.VaultFeatureToggle;
import com.gap.customer.vaultservice.util.VaultConstants;
import org.jetbrains.annotations.NotNull;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.junit.jupiter.SpringExtension;

import javax.servlet.http.HttpServletRequest;
import java.util.HashMap;
import java.util.Map;

import static com.gap.customer.vaultservice.util.VaultConstants.HTTP_STATUS_BAD_REQUEST;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(SpringExtension.class)
public class MatchServiceImplTest {

    @InjectMocks
    private MatchServiceImpl matchService;

    @Mock
    private ClientMediator clientMediator;

    @Mock
    private HttpServletRequest httpServletRequest;

    @Mock
    private VaultFeatureToggle vaultFeatureToggle;

    @Mock
    private MatchServiceValidator matchServiceValidator;

    @Test
    public void shouldThrowValidationExceptionForMatchWhenValidatingMatchRequestFails() throws VaultServiceException {
        ValidationException validationException = getValidationExceptionFor(
                ErrorCodes.INPUT_DATA_MISSING,
                ErrorEntityMessage.INPUT_DATA_MISSING_FOR_MATCH_USERMESSAGE
        );
        when(matchServiceValidator.hasValidVaultPostRequests(any(MatchRequest.class)))
                .thenThrow(validationException);

        ValidationException actualResult = assertThrows(ValidationException.class, () ->
                matchService.match(getMatchRequest(), getHeadersFromRequest(httpServletRequest)));

        assertEquals(validationException, actualResult);
    }

    @Test
    public void shouldThrowVaultServiceExceptionForMatchWhenIsLegacyCloudReturnsTrue() throws VaultServiceException {
        when(matchServiceValidator.hasValidVaultPostRequests(any(MatchRequest.class))).thenReturn(true);
        when(vaultFeatureToggle.isLegacyCloud()).thenReturn(true);

        VaultServiceException expectedException = new VaultServiceException("Match Request is not supported");
        VaultServiceException actualResult = assertThrows(VaultServiceException.class, () ->
                matchService.match(getMatchRequest(), getHeadersFromRequest(httpServletRequest)));

        assertEquals(expectedException.getMessage(), actualResult.getMessage());
    }

    @Test
    public void shouldThrowExceptionForMatchWhenMapperForMatchThrowsAnException() throws Exception {
        when(matchServiceValidator.hasValidVaultPostRequests(any(MatchRequest.class))).thenReturn(true);
        when(vaultFeatureToggle.isLegacyCloud()).thenReturn(false);
        VaultServiceException exception = new VaultServiceException("Something went wrong while processing the match request");
        when(clientMediator.mapperForMatch(any(MatchRequest.class))).thenThrow(exception);

        VaultServiceException actualResult = assertThrows(VaultServiceException.class, () ->
                matchService.match(getMatchRequest(), getHeadersFromRequest(httpServletRequest)));

        assertEquals(exception.getMessage(), actualResult.getMessage());
    }

    @Test
    public void shouldReturnMatchResponseForMatchWhenMapperForMatchReturnsTheResponse() throws Exception {
        when(matchServiceValidator.hasValidVaultPostRequests(any(MatchRequest.class))).thenReturn(true);
        when(vaultFeatureToggle.isLegacyCloud()).thenReturn(false);
        MatchResponse matchResponse = MatchResponse.builder().result(true).build();
        when(clientMediator.mapperForMatch(any(MatchRequest.class))).thenReturn(matchResponse);

        ResponseEntity<MatchResponse> actualResult = matchService.match(
                getMatchRequest(),
                getHeadersFromRequest(httpServletRequest)
        );

        assertEquals(matchResponse, actualResult.getBody());
    }

    private MatchRequest getMatchRequest() {
        return MatchRequest.builder()
                .plaintext("testPassword")
                .vaultId("26DD0155DFBB037CCAE71ADBCA67A689")
                .type(VaultConstants.DATA_TYPE_PASSWORD)
                .build();
    }

    @NotNull
    private ValidationException getValidationExceptionFor(String errorCode, String errorMessage) {
        return new ValidationException(
                new ErrorEntityInternal(HTTP_STATUS_BAD_REQUEST,
                        new ErrorEntity(null,
                                errorMessage,
                                Integer.valueOf(errorCode),
                                null
                        )
                )
        );
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
