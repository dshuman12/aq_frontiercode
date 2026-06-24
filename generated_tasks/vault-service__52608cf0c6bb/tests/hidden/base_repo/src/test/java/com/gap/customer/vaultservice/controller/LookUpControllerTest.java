package com.gap.customer.vaultservice.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gap.customer.vaultservice.Validators.LookUpValidator;
import com.gap.customer.vaultservice.dto.LookUpDataDTO;
import com.gap.customer.vaultservice.error.ErrorEntityBuilder;
import com.gap.customer.vaultservice.models.LookUpData;
import com.gap.customer.vaultservice.services.LookUpService;
import org.junit.jupiter.api.Test;
import org.skyscreamer.jsonassert.JSONAssert;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.RequestBuilder;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

import java.util.ArrayList;
import java.util.List;

import static com.gap.customer.vaultservice.util.VaultConstants.AZURE_DB_TIMEOUT;
import static com.gap.customer.vaultservice.util.VaultConstants.TOKENIZE_TIMEOUT;
import static java.util.Arrays.asList;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;

@WebMvcTest(value = {LookUpController.class, ErrorEntityBuilder.class, LookUpValidator.class})
class LookUpControllerTest {
    private static final String LOOKUP_DATA_PATH = "/lookUp";
    private static final String BLUEFIN = "BLUEFIN";
    private static final String LEGACY = "LEGACY";
    private static final String TRUE = "true";
    private static final String FALSE = "false";

    @MockBean
    private LookUpService lookUpService;
    @Autowired
    private MockMvc mockMvc;

    @Test
    void shouldTurnOnBluefinFlag() throws Exception {
        List<LookUpData> lookUpData = asList(LookUpData.builder().lookupKey(BLUEFIN).lookupValue(TRUE).build());
        RequestBuilder requestBuilder = getRequestBuilder(lookUpData);
        doNothing().when(lookUpService).updateLookUpData(lookUpData);

        MvcResult result = mockMvc.perform(requestBuilder).andReturn();
        MockHttpServletResponse response = result.getResponse();

        assertEquals(HttpStatus.OK.value(), response.getStatus());
    }

    @Test
    void shouldTurnOffBluefinFlag() throws Exception {
        List<LookUpData> lookUpData = asList(LookUpData.builder().lookupKey(BLUEFIN).lookupValue(FALSE).build());
        RequestBuilder requestBuilder = getRequestBuilder(lookUpData);
        doNothing().when(lookUpService).updateLookUpData(lookUpData);

        MvcResult result = mockMvc.perform(requestBuilder).andReturn();
        MockHttpServletResponse response = result.getResponse();

        assertEquals(HttpStatus.OK.value(), response.getStatus());
    }

    @Test
    void shouldUpdateFlags() throws Exception {
        ArrayList<LookUpData> lookUpData = new ArrayList<>();
        lookUpData.add(LookUpData.builder().lookupKey(BLUEFIN).lookupValue(TRUE).build());
        lookUpData.add(LookUpData.builder().lookupKey(TOKENIZE_TIMEOUT).lookupValue("50").build());
        lookUpData.add(LookUpData.builder().lookupKey(LEGACY).lookupValue(FALSE).build());
        doNothing().when(lookUpService).updateLookUpData(lookUpData);
        RequestBuilder requestBuilder = getRequestBuilder(lookUpData);

        MvcResult result = mockMvc.perform(requestBuilder).andReturn();
        MockHttpServletResponse response = result.getResponse();

        assertEquals(HttpStatus.OK.value(), response.getStatus());
    }

    @Test
    void shouldReturnInvalidLookUpDataResponse() throws Exception {
        List<LookUpData> lookUpData = asList(LookUpData.builder().lookupKey("BLUFIN").lookupValue(FALSE).build());
        RequestBuilder requestBuilder = getRequestBuilder(lookUpData);
        doNothing().when(lookUpService).updateLookUpData(lookUpData);
        String expectedResponse = "{\"userMessage\": \"Invalid lookup data.\", \"errorCode\": 3}";

        MvcResult result = mockMvc.perform(requestBuilder).andReturn();
        MockHttpServletResponse response = result.getResponse();

        assertEquals(HttpStatus.BAD_REQUEST.value(), response.getStatus());
        JSONAssert.assertEquals(expectedResponse, response.getContentAsString(), false);
    }

    @Test
    void shouldGetLookUpData() throws Exception {
        ArrayList<LookUpDataDTO> lookUpData = new ArrayList<>();
        lookUpData.add(LookUpDataDTO.builder().lookupKey(BLUEFIN).lookupValue(TRUE).build());
        lookUpData.add(LookUpDataDTO.builder().lookupKey(TOKENIZE_TIMEOUT).lookupValue("50").build());
        lookUpData.add(LookUpDataDTO.builder().lookupKey(LEGACY).lookupValue(TRUE).build());
        lookUpData.add(LookUpDataDTO.builder().lookupKey(AZURE_DB_TIMEOUT).lookupValue("2000").build());
        MockHttpServletRequestBuilder requestBuilder = MockMvcRequestBuilders.get(LOOKUP_DATA_PATH)
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.APPLICATION_JSON);
        when(lookUpService.getLookUpData()).thenReturn(lookUpData);
        String expectedResponse = "[{\"lookupKey\": \"BLUEFIN\", \"lookupValue\": \"true\"}," +
                "{\"lookupKey\": \"TOKENIZETIMEOUT\", \"lookupValue\": \"50\"}, {\"lookupKey\": \"LEGACY\", \"lookupValue\": \"true\"}," +
                "{\"lookupKey\": \"AZUREDBTIMEOUT\", \"lookupValue\": \"2000\"}]";

        MvcResult result = mockMvc.perform(requestBuilder).andReturn();
        MockHttpServletResponse response = result.getResponse();

        assertEquals(HttpStatus.OK.value(), response.getStatus());
        JSONAssert.assertEquals(expectedResponse, response.getContentAsString(), false);
    }

    private MockHttpServletRequestBuilder getRequestBuilder(List<LookUpData> LookUpData) {
        return MockMvcRequestBuilders.post(LOOKUP_DATA_PATH)
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.APPLICATION_JSON)
                .content(asJsonString(LookUpData));
    }

    public static String asJsonString(final Object object) {
        try {
            return new ObjectMapper().writeValueAsString(object);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}