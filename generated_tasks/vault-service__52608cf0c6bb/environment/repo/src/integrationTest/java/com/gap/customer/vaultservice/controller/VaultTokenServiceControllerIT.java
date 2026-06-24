package com.gap.customer.vaultservice.controller;

import com.gap.customer.vaultservice.VaultServiceApplication;
import com.gap.customer.vaultservice.error.ErrorEntity;
import com.gap.customer.vaultservice.models.TokenRequest;
import com.gap.customer.vaultservice.models.TokenResponse;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.*;
import org.springframework.test.context.junit4.SpringJUnit4ClassRunner;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;

import static org.junit.Assert.assertEquals;

@RunWith(SpringJUnit4ClassRunner.class)
@ComponentScan
@SpringBootTest(properties = {"server.port=9000"},
		classes = {VaultServiceApplication.class},
        webEnvironment = SpringBootTest.WebEnvironment.DEFINED_PORT)
public class VaultTokenServiceControllerIT {

	private static final String VAULT_SERVICE_URL = "http://localhost:9000/tokens";

	private TestRestTemplate restTemplate;
	private List<TokenRequest> tokenRequests;

	@Before
	public void setUp() {
		restTemplate = new TestRestTemplate();
		tokenRequests = new ArrayList<TokenRequest>();
		List<TokenResponse> tokenResponses = new ArrayList<TokenResponse>();
	}

	//@Test
	public void testGetTokensSuccessIT() {

		tokenRequests = getRequest();
		HttpEntity<List> requestEntity = new HttpEntity<List>(tokenRequests, setRequestHeaders());
		ResponseEntity<List<LinkedHashMap>> actualResponse = restTemplate.exchange(VAULT_SERVICE_URL, HttpMethod.POST,
				requestEntity, new ParameterizedTypeReference<List<LinkedHashMap>>() {
				});

		assertEquals(actualResponse.getStatusCode(), HttpStatus.OK);
		assertEquals(actualResponse.getBody().size(), 2);
		assertEquals(actualResponse.getBody().get(0).get("token"), "4558648846903826");
		assertEquals(actualResponse.getBody().get(0).get("index").toString(), "0");
		assertEquals(actualResponse.getBody().get(1).get("token"), "4988697034836355");
		assertEquals(actualResponse.getBody().get(1).get("index").toString(), "1");

	}


	@Test
	public void testEmptyTokenRequestListIT() {

		HttpEntity<List> requestEntity = new HttpEntity<List>(tokenRequests, setRequestHeaders());
		ResponseEntity<ErrorEntity> actualResponse = restTemplate.exchange(VAULT_SERVICE_URL, HttpMethod.POST,
				requestEntity, ErrorEntity.class);

		assertEquals(actualResponse.getStatusCode(), HttpStatus.BAD_REQUEST);
		assertEquals(actualResponse.getBody().getUserMessage(), "Index, type or plaintext is missing.");
		assertEquals(actualResponse.getBody().getErrorCode().toString(), "3");
	}

	@Test
	public void testMissingTokenDataIT() {

		tokenRequests.add(getRequest("VAULT_ID","",0));
		HttpEntity<List> requestEntity = new HttpEntity<List>(tokenRequests, setRequestHeaders());
		ResponseEntity<ErrorEntity> actualResponse = restTemplate.exchange(VAULT_SERVICE_URL, HttpMethod.POST,
				requestEntity, ErrorEntity.class);

		assertEquals(actualResponse.getStatusCode(), HttpStatus.BAD_REQUEST);
		assertEquals(actualResponse.getBody().getUserMessage(), "Index, type or plaintext is missing.");
		assertEquals(actualResponse.getBody().getErrorCode().toString(), "3");
	}

	@Test
	public void tesMissingTokenTypeIT() {

		tokenRequests.add(getRequest("","51940520004144A2FA626C91168307A8",0));
		HttpEntity<List> requestEntity = new HttpEntity<List>(tokenRequests, setRequestHeaders());
		ResponseEntity<ErrorEntity> actualResponse = restTemplate.exchange(VAULT_SERVICE_URL, HttpMethod.POST,
				requestEntity, ErrorEntity.class);

		assertEquals(actualResponse.getStatusCode(), HttpStatus.BAD_REQUEST);
		assertEquals(actualResponse.getBody().getUserMessage(), "Index, type or plaintext is missing.");
		assertEquals(actualResponse.getBody().getErrorCode().toString(), "3");
	}

	@Test
	public void testInvalidTokenTypeVauleIT() {

		tokenRequests.add(getRequest("VAULTID","51940520004144A2FA626C91168307A8",0));
		HttpEntity<List> requestEntity = new HttpEntity<List>(tokenRequests, setRequestHeaders());
		ResponseEntity<ErrorEntity> actualResponse = restTemplate.exchange(VAULT_SERVICE_URL, HttpMethod.POST,
				requestEntity, ErrorEntity.class);

		assertEquals(actualResponse.getStatusCode(), HttpStatus.BAD_REQUEST);
		assertEquals(actualResponse.getBody().getUserMessage(), "Some types are invalid.");
		assertEquals(actualResponse.getBody().getErrorCode().toString(), "2");
	}


	@Test
	public void testTokenDataMaxLengthIT() {

		tokenRequests.add(getRequest("VAULT_ID","51940520004144A2FA626C91168307A8A",0));
		HttpEntity<List> requestEntity = new HttpEntity<List>(tokenRequests, setRequestHeaders());
		ResponseEntity<ErrorEntity> actualResponse = restTemplate.exchange(VAULT_SERVICE_URL, HttpMethod.POST,
				requestEntity, ErrorEntity.class);

		assertEquals(actualResponse.getStatusCode(), HttpStatus.BAD_REQUEST);
		assertEquals(actualResponse.getBody().getUserMessage(), "Invalid vault-id length - maximum allowed length is 32.");
		assertEquals(actualResponse.getBody().getErrorCode().toString(), "5");
	}


	@Test
	public void testIndexesNotUniqueIT() {

		tokenRequests.add(getRequest("VAULT_ID","51940520004144A2FA626C91168307A8",0));
		tokenRequests.add(getRequest("VAULT_ID","E4E7B12EA55B99BB3C21738E22EFE6F7",0));

		HttpEntity<List> requestEntity = new HttpEntity<List>(tokenRequests, setRequestHeaders());
		ResponseEntity<ErrorEntity> actualResponse = restTemplate.exchange(VAULT_SERVICE_URL, HttpMethod.POST,
				requestEntity, ErrorEntity.class);

		assertEquals(actualResponse.getStatusCode(), HttpStatus.BAD_REQUEST);
		assertEquals(actualResponse.getBody().getUserMessage(), "Indexes are not unique.");
		assertEquals(actualResponse.getBody().getErrorCode().toString(), "1");
	}

	private List<TokenRequest> getRequest() {
		List<TokenRequest> tokenRequests = new ArrayList<TokenRequest>();
		TokenRequest tokenRequest_1 = new TokenRequest();
		tokenRequest_1.setType("VAULT_ID");
		tokenRequest_1.setData("51940520004144A2FA626C91168307A8");
		tokenRequest_1.setIndex(0);

		TokenRequest tokenRequest_2 = new TokenRequest();
		tokenRequest_2.setType("VAULT_ID");
		tokenRequest_2.setData("E4E7B12EA55B99BB3C21738E22EFE6F7");
		tokenRequest_2.setIndex(1);

		tokenRequests.add(tokenRequest_1);
		tokenRequests.add(tokenRequest_2);
		return tokenRequests;
	}


	private TokenRequest getRequest(String type, String data, int index) {

		TokenRequest tokenRequest = new TokenRequest();
		tokenRequest.setType(type);
		tokenRequest.setData(data);
		tokenRequest.setIndex(index);
		return tokenRequest;
	}

	private HttpHeaders setRequestHeaders() {
		HttpHeaders headers = new HttpHeaders();
		headers.setContentType(MediaType.APPLICATION_JSON);
		headers.setAccept(Collections.singletonList(MediaType.APPLICATION_JSON));
		return headers;
	}

}
