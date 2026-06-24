package com.gap.customer.vaultservice.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gap.customer.vaultservice.error.ErrorEntityBuilder;
import com.gap.customer.vaultservice.error.ErrorEntityCodes;
import com.gap.customer.vaultservice.exception.ValidationException;
import com.gap.customer.vaultservice.models.MatchRequest;
import com.gap.customer.vaultservice.models.MatchResponse;
import com.gap.customer.vaultservice.models.VaultDataScopeConfig;
import com.gap.customer.vaultservice.services.MatchService;
import com.gap.customer.vaultservice.util.VaultConstants;
import org.jetbrains.annotations.NotNull;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.skyscreamer.jsonassert.JSONAssert;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.Mockito.when;

@WebMvcTest(value = {MatchController.class, VaultDataScopeConfig.class, ErrorEntityBuilder.class})
public class MatchControllerTest {

    private static final String MATCH_PATH = "/match";

    @MockBean
    private MatchService matchService;

    @Autowired
    private MockMvc mockMvc;

    @Test
    void shouldReturnMatchResponseForGivenMatchRequest() throws Exception {
        MatchResponse matchResponse = MatchResponse.builder().result(true).build();
        ResponseEntity<MatchResponse> responseEntity = new ResponseEntity<>(matchResponse, HttpStatus.OK);
        when(matchService.match(any(MatchRequest.class), anyMap()))
                .thenReturn(responseEntity);

        MatchRequest matchRequest = getMatchRequest();
        MockHttpServletRequestBuilder requestBuilder = getRequestBuilderFor(matchRequest);
        MvcResult mvcResult = mockMvc.perform(requestBuilder).andReturn();
        MockHttpServletResponse response = mvcResult.getResponse();

        String expectedResponse = "{\"result\": true}";
        assertEquals(HttpStatus.OK.value(), response.getStatus());
        JSONAssert.assertEquals(expectedResponse, response.getContentAsString(), false);
    }

    @Test
    void shouldReturnInvalidRequestResponseForInvalidMatchRequest() throws Exception {
        when(matchService.match(any(MatchRequest.class), anyMap()))
                .thenThrow(new ValidationException(ErrorEntityCodes.INVALID_REQUEST));

        MatchRequest matchRequest = getMatchRequest();
        MockHttpServletRequestBuilder requestBuilder = getRequestBuilderFor(matchRequest);
        MvcResult mvcResult = mockMvc.perform(requestBuilder).andReturn();
        MockHttpServletResponse response = mvcResult.getResponse();

        String expectedResponse = "{\"userMessage\":\"Invalid  request\", \"errorCode\": 3}";
        assertEquals(HttpStatus.BAD_REQUEST.value(), response.getStatus());
        JSONAssert.assertEquals(expectedResponse, response.getContentAsString(), false);
    }

    private MatchRequest getMatchRequest() {
        return MatchRequest.builder()
                .plaintext("testPassword")
                .vaultId("26DD0155DFBB037CCAE71ADBCA67A689")
                .type(VaultConstants.DATA_TYPE_PASSWORD)
                .build();
    }

    @NotNull
    private MockHttpServletRequestBuilder getRequestBuilderFor(MatchRequest matchRequest) {
        return MockMvcRequestBuilders.post(MATCH_PATH)
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.APPLICATION_JSON)
                .content(asJsonString(matchRequest));
    }

    /**
     * Converts request to Json String
     *
     * @param obj Input request object
     * @return String of Json
     */
    private static String asJsonString(final Object obj) {
        try {
            return new ObjectMapper().writeValueAsString(obj);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

}
