package com.gap.customer.vaultservice.services.Impl;

import com.gap.customer.vaultservice.dto.TokenDataDTO;
import com.gap.customer.vaultservice.exception.DataNotFoundException;
import com.gap.customer.vaultservice.exception.VaultServiceException;
import com.gap.customer.vaultservice.models.MatchRequest;
import com.gap.customer.vaultservice.models.MatchResponse;
import com.gap.customer.vaultservice.models.VaultClientRequest;
import com.gap.customer.vaultservice.models.VaultClientResponse;
import com.gap.customer.vaultservice.models.VaultClientResult;
import com.gap.customer.vaultservice.models.VaultSearchRequest;
import com.gap.customer.vaultservice.util.VaultConstants;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.junit.jupiter.SpringExtension;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.when;

@ExtendWith(SpringExtension.class)
class VaultClientResponseHelperImplTest {

    @MockBean
    private TokenClientAdapter tokenClientAdapter;
    @MockBean
    private EncryptionClientAdapter encryptionClientAdapter;
    @MockBean
    private PasswordClientAdapter passwordClientAdapter;

    private VaultClientResponseHelper vaultClientResponseHelper;

    @BeforeEach
    public void setup() {
        vaultClientResponseHelper = new VaultClientResponseHelperImpl(tokenClientAdapter, encryptionClientAdapter, passwordClientAdapter);
    }

    @Test
    void shouldReturnVaultIdsForCreateVaultIdDataForCreditCardWhenValidCreditCardNumbersAreGiven() throws VaultServiceException {
        String[] creditCardNumbers = new String[]{"411111111111111", "411111111111112"};
        VaultClientRequest vaultClientRequest = VaultClientRequest.builder().requestFormat("CreditCardNumber")
                .responseFormat("VaultId").requestData(creditCardNumbers).build();
        when(tokenClientAdapter.store(anyList(), anyString())).thenReturn(getTokenDataDTOsForCreditCardVaultEntries());
        ArrayList<VaultClientResult> vaultClientResults = new ArrayList<>();
        vaultClientResults.add(VaultClientResult.builder().requestData("411111111111111")
                .responseData("3CFB3DFA5995CC7681699A692479C047").build());
        vaultClientResults.add(VaultClientResult.builder().requestData("411111111111112")
                .responseData("3CFB3DFA5995CC7681699A692479C048").build());
        VaultClientResponse expectedVaultClientResponse = VaultClientResponse.builder().
                requestFormat("CreditCardNumber").responseFormat("VaultId").result(vaultClientResults).build();

        VaultClientResponse actualVaultClientResponse = vaultClientResponseHelper
                .createVaultIdDataForCreditCard(vaultClientRequest, "UNAUTHENTICATED");

        assertEquals(expectedVaultClientResponse, actualVaultClientResponse);
    }

    @Test
    public void shouldReturnTrueInMatchResponseForMatchPasswordWhenGivenDataIsMatched() throws Exception {
        when(passwordClientAdapter.retrieve(any(), any())).thenReturn("testPassword");

        MatchResponse expectedResponse = MatchResponse.builder().result(true).build();
        MatchResponse actualResponse = vaultClientResponseHelper.matchPassword(getMatchRequest());

        assertEquals(expectedResponse, actualResponse);
    }

    @Test
    public void shouldReturnFalseInMatchResponseForMatchPasswordWhenGivenDataIsNotMatched() throws Exception {
        when(passwordClientAdapter.retrieve(any(), any())).thenReturn("wrongPassword");

        MatchResponse expectedResponse = MatchResponse.builder().result(false).build();
        MatchResponse actualResponse = vaultClientResponseHelper.matchPassword(getMatchRequest());

        assertEquals(expectedResponse, actualResponse);
    }

    @Test
    public void shouldThroughExceptionWhenClientAdapterThrowsAnException() throws Exception {
        when(passwordClientAdapter.retrieve(any(), any())).thenThrow(new VaultServiceException());

        assertThrows(VaultServiceException.class, () -> vaultClientResponseHelper.matchPassword(getMatchRequest()));
    }

    @Test
    public void shouldGiveResultAsFalseWhenClientAdapterThrowsDataNotFoundException() throws Exception {
        when(passwordClientAdapter.retrieve(any(), any())).thenThrow(new DataNotFoundException());

        MatchResponse expectedResponse = MatchResponse.builder().result(false).build();
        MatchResponse actualResponse = vaultClientResponseHelper.matchPassword(getMatchRequest());

        assertEquals(expectedResponse, actualResponse);
    }

    @Test
    public void shouldReturnVaultClientResponseForSearchByVaultIdForTokenWhenVaultIdsAreValid() throws VaultServiceException {
        when(tokenClientAdapter.retrieveTokensFor(any(String[].class), any())).thenReturn(getTokenDataDTOs());

        VaultClientResponse expectedResponse = getVaultClientResponseForVaultEntriesSearch();
        VaultClientResponse actualResponse = vaultClientResponseHelper.searchByVaultIdForToken(createValidVaultEntriesSearchRequest(), "");

        assertEquals(expectedResponse.getResult().get(0), actualResponse.getResult().get(0));
        assertEquals(expectedResponse.getResult().get(1), actualResponse.getResult().get(1));
    }

    @Test
    public void shouldThrowErrorForSearchByVaultIdForTokenWhenRetrieveTokensForThrowsAnError() throws VaultServiceException {
        String ERROR_MESSAGE = "Unable to get token info for given vault ids";
        when(tokenClientAdapter.retrieveTokensFor(any(String[].class), any())).thenThrow(new VaultServiceException(ERROR_MESSAGE));

        VaultServiceException actualResult = assertThrows(VaultServiceException.class, () -> {
            vaultClientResponseHelper.searchByVaultIdForToken(createValidVaultEntriesSearchRequest(), "");
        });

        Assertions.assertEquals(ERROR_MESSAGE, actualResult.getMessage());
    }

    @Test
    public void shouldReturnEmptyResultInVaultClientResponseForSearchByVaultIdForTokenWhenVoltageTokenIsNull() throws VaultServiceException {
        when(tokenClientAdapter.retrieveTokensFor(any(String[].class), any())).thenReturn(List.of(TokenDataDTO.builder().vaultId("ABC").build()));

        VaultClientResponse actualResponse = vaultClientResponseHelper.searchByVaultIdForToken(createValidVaultEntriesSearchRequest(), "");

        assertEquals(0, actualResponse.getResult().size());
    }

    private List<TokenDataDTO> getTokenDataDTOs() {
        ArrayList<TokenDataDTO> tokenDataDTOs = new ArrayList<>();

        TokenDataDTO tokenDataDTO1 = TokenDataDTO.builder().voltageToken("4485867467951655")
                .bluefinToken("4485861361361655")
                .vaultId("0A3C98B7FEE1D56CB991E3E18D6D6170")
                .bluefinId("djI6MTIwMjIwMjE2MTM0NDMxMTAxMjI5Nzg2NXxiYzVkMDU3YjUwMzkyMDA3N2JkZjBiZmE3ODVhYWU2Znx8fA==")
                .build();
        tokenDataDTOs.add(tokenDataDTO1);

        TokenDataDTO tokenDataDTO2 = TokenDataDTO.builder().voltageToken("6018596782192368")
                .bluefinToken("6018592939132368")
                .vaultId("C77F3BACA901976D3A99A1818E26C287")
                .bluefinId("djI6MTIwMjIwMjE3MDU1MjU5MTAyMTU4NjA3MnxiYzVkMDU3YjUwMzkyMDA3N2JkZjBiZmE3ODVhYWU2Znx8fA==")
                .build();
        tokenDataDTOs.add(tokenDataDTO2);

        return tokenDataDTOs;
    }

    private List<TokenDataDTO> getTokenDataDTOsForCreditCardVaultEntries() {
        ArrayList<TokenDataDTO> tokenDataDTOs = new ArrayList<>();

        TokenDataDTO tokenDataDTO1 = TokenDataDTO.builder().voltageToken("411111902801111")
                .bluefinToken("411111921191111")
                .vaultId("3CFB3DFA5995CC7681699A692479C047")
                .bluefinId("djI6MTIwMjIwMjI0MTAwOTUzMTAyMzA0NzkxNiMwfGJjNWQwNTdiNTAzOTIwMDc3YmRmMGJmYTc4NWFhZTZmfHx8")
                .plaintext("411111111111111")
                .build();
        tokenDataDTOs.add(tokenDataDTO1);

        TokenDataDTO tokenDataDTO2 = TokenDataDTO.builder().voltageToken("411111973431112")
                .bluefinToken("411111921191112")
                .vaultId("3CFB3DFA5995CC7681699A692479C048")
                .bluefinId("djI6MTIwMjIwMjI0MTAxMTEyMTAzMjI2NTI2MyMxfGJjNWQwNTdiNTAzOTIwMDc3YmRmMGJmYTc4NWFhZTZmfHx8")
                .plaintext("411111111111112")
                .build();
        tokenDataDTOs.add(tokenDataDTO2);

        return tokenDataDTOs;
    }


    private VaultClientRequest createValidVaultEntriesSearchRequest() {
        List<VaultSearchRequest> vaultRequests = new ArrayList<>();
        VaultSearchRequest vaultRequest1 = VaultSearchRequest.builder()
                .returnType(VaultConstants.REQ_TYPE_VAULT_ID)
                .index(0)
                .vaultId("0A3C98B7FEE1D56CB991E3E18D6D6170")
                .build();

        VaultSearchRequest vaultRequest2 = VaultSearchRequest.builder()
                .returnType(VaultConstants.REQ_TYPE_VAULT_ID)
                .index(1)
                .vaultId("C77F3BACA901976D3A99A1818E26C287")
                .build();

        vaultRequests.add(vaultRequest1);
        vaultRequests.add(vaultRequest2);

        VaultClientRequest vaultClientRequest = VaultClientRequest.builder()
                .responseFormat(VaultConstants.DATA_TYPE_TOKEN)
                .requestFormat(VaultConstants.REQ_TYPE_VAULT_ID)
                .requestData(setVaultIdsList(vaultRequests))
                .build();

        return vaultClientRequest;
    }

    private String[] setVaultIdsList(List<VaultSearchRequest> vaultSearchRequests) {
        return vaultSearchRequests.stream()
                .map(VaultSearchRequest::getVaultId)
                .toArray(String[]::new);
    }

    private VaultClientResponse getVaultClientResponseForVaultEntriesSearch() {
        var vaultClientResults = new ArrayList<VaultClientResult>();
        vaultClientResults.add(VaultClientResult.builder().requestData("0A3C98B7FEE1D56CB991E3E18D6D6170")
                .responseData("4485867467951655")
                .bluefinId("djI6MTIwMjIwMjE2MTM0NDMxMTAxMjI5Nzg2NXxiYzVkMDU3YjUwMzkyMDA3N2JkZjBiZmE3ODVhYWU2Znx8fA==")
                .bluefinToken("4485861361361655")
                .build());
        vaultClientResults.add(VaultClientResult.builder().requestData("C77F3BACA901976D3A99A1818E26C287")
                .responseData("6018596782192368")
                .bluefinId("djI6MTIwMjIwMjE3MDU1MjU5MTAyMTU4NjA3MnxiYzVkMDU3YjUwMzkyMDA3N2JkZjBiZmE3ODVhYWU2Znx8fA==")
                .bluefinToken("6018592939132368")
                .build());

        return VaultClientResponse.builder()
                .result(vaultClientResults)
                .requestFormat("VAULT_ID")
                .responseFormat(VaultConstants.DATA_TYPE_TOKEN)
                .build();
    }

    private MatchRequest getMatchRequest() {
        return MatchRequest.builder()
                .plaintext("testPassword")
                .vaultId("26DD0155DFBB037CCAE71ADBCA67A689")
                .type(VaultConstants.DATA_TYPE_PASSWORD)
                .build();
    }
}