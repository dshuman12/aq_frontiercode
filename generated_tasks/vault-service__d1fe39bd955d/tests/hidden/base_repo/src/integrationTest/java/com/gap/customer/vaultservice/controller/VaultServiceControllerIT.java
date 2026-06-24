package com.gap.customer.vaultservice.controller;

import com.gap.customer.vaultservice.VaultServiceApplication;
import com.gap.customer.vaultservice.error.ErrorEntity;
import com.gap.customer.vaultservice.models.VaultRequest;
import com.gap.customer.vaultservice.models.VaultResponse;
import org.junit.Before;
import org.junit.Ignore;
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

@Ignore
@RunWith(SpringJUnit4ClassRunner.class)
@ComponentScan
@SpringBootTest(properties = {"server.port=9000"},
		classes = {VaultServiceApplication.class},
        webEnvironment = SpringBootTest.WebEnvironment.DEFINED_PORT)
public class VaultServiceControllerIT {

	private static final String VAULT_SERVICE_URL = "http://localhost:9000/vault-ids";

	private TestRestTemplate restTemplate;
	private List<VaultRequest> vaultRequests;

	@Before
	public void setUp() {
		restTemplate = new TestRestTemplate();
		vaultRequests = new ArrayList<VaultRequest>();
		List<VaultResponse> vaultResponses = new ArrayList<VaultResponse>();
	}

	@Test
	public void testGetVaultIdsSuccessIT() {

		vaultRequests = getRequest();
		HttpEntity<List> requestEntity = new HttpEntity<List>(vaultRequests, setRequestHeaders());
		ResponseEntity<List<LinkedHashMap>> actualResponse = restTemplate.exchange(VAULT_SERVICE_URL, HttpMethod.POST,
				requestEntity, new ParameterizedTypeReference<List<LinkedHashMap>>() {
				});

		assertEquals(actualResponse.getStatusCode(), HttpStatus.OK);
		assertEquals(actualResponse.getBody().size(), 2);
		assertEquals(actualResponse.getBody().get(0).get("vaultId"), "475AABCFCE48CF4D24978E44E8A4E90E");
		assertEquals(actualResponse.getBody().get(0).get("index").toString(), "0");
		assertEquals(actualResponse.getBody().get(1).get("vaultId"), "7467EBB11F1DF3F0BD1AF71F18C83B75");
		assertEquals(actualResponse.getBody().get(1).get("index").toString(), "1");

	}


	@Test
	public void testEmptyRequestListIT() {

		HttpEntity<List> requestEntity = new HttpEntity<List>(vaultRequests, setRequestHeaders());
		ResponseEntity<ErrorEntity> actualResponse = restTemplate.exchange(VAULT_SERVICE_URL, HttpMethod.POST,
				requestEntity, ErrorEntity.class);

		assertEquals(actualResponse.getStatusCode(), HttpStatus.BAD_REQUEST);
		assertEquals(actualResponse.getBody().getUserMessage(), "Index, type or plaintext is missing.");
		assertEquals(actualResponse.getBody().getErrorCode().toString(), "3");
	}

	@Test
	public void testMissingPlainTextIT() {

		vaultRequests.add(new VaultRequest("CREDIT_CARD_NUMBER", "", 0));
		vaultRequests.add(new VaultRequest("CREDIT_CARD_NUMBER", "5555555555554440", 1));

		HttpEntity<List> requestEntity = new HttpEntity<List>(vaultRequests, setRequestHeaders());
		ResponseEntity<ErrorEntity> actualResponse = restTemplate.exchange(VAULT_SERVICE_URL, HttpMethod.POST,
				requestEntity, ErrorEntity.class);

		assertEquals(actualResponse.getStatusCode(), HttpStatus.BAD_REQUEST);
		assertEquals(actualResponse.getBody().getUserMessage(), "Index, type or plaintext is missing.");
		assertEquals(actualResponse.getBody().getErrorCode().toString(), "3");
	}

	@Test
	public void tesMissingTypeIT() {

		vaultRequests.add(new VaultRequest("", "4111111111111111", 0));
		vaultRequests.add(new VaultRequest("CREDIT_CARD_NUMBER", "5555555555554440", 1));

		HttpEntity<List> requestEntity = new HttpEntity<List>(vaultRequests, setRequestHeaders());
		ResponseEntity<ErrorEntity> actualResponse = restTemplate.exchange(VAULT_SERVICE_URL, HttpMethod.POST,
				requestEntity, ErrorEntity.class);

		assertEquals(actualResponse.getStatusCode(), HttpStatus.BAD_REQUEST);
		assertEquals(actualResponse.getBody().getUserMessage(), "Index, type or plaintext is missing.");
		assertEquals(actualResponse.getBody().getErrorCode().toString(), "3");
	}

	@Test
	public void testInvalidTypeVauleIT() {

		vaultRequests.add(new VaultRequest("CREDIT_CARD_NUMBERS", "4111111111111111", 0));
		vaultRequests.add(new VaultRequest("CREDIT_CARD_NUMBER", "5555555555554440", 1));

		HttpEntity<List> requestEntity = new HttpEntity<List>(vaultRequests, setRequestHeaders());
		ResponseEntity<ErrorEntity> actualResponse = restTemplate.exchange(VAULT_SERVICE_URL, HttpMethod.POST,
				requestEntity, ErrorEntity.class);

		assertEquals(actualResponse.getStatusCode(), HttpStatus.BAD_REQUEST);
		assertEquals(actualResponse.getBody().getUserMessage(), "Some types are invalid.");
		assertEquals(actualResponse.getBody().getErrorCode().toString(), "2");
	}

	@Test
	public void testPlainTextIsNumericIT() {

		vaultRequests.add(new VaultRequest("CREDIT_CARD_NUMBER", "abcdefghijklmnop", 0));
		vaultRequests.add(new VaultRequest("CREDIT_CARD_NUMBER", "5555555555554440", 1));

		HttpEntity<List> requestEntity = new HttpEntity<List>(vaultRequests, setRequestHeaders());
		ResponseEntity<ErrorEntity> actualResponse = restTemplate.exchange(VAULT_SERVICE_URL, HttpMethod.POST,
				requestEntity, ErrorEntity.class);

		assertEquals(actualResponse.getStatusCode(), HttpStatus.BAD_REQUEST);
		assertEquals(actualResponse.getBody().getUserMessage(), "Some credit card numbers are invalid.");
		assertEquals(actualResponse.getBody().getErrorCode().toString(), "5");
	}

	@Test
	public void testPlainTextMinLengthIT() {

		vaultRequests.add(new VaultRequest("CREDIT_CARD_NUMBER", "411111111111", 0));
		vaultRequests.add(new VaultRequest("CREDIT_CARD_NUMBER", "5555555555554440", 1));

		HttpEntity<List> requestEntity = new HttpEntity<List>(vaultRequests, setRequestHeaders());
		ResponseEntity<ErrorEntity> actualResponse = restTemplate.exchange(VAULT_SERVICE_URL, HttpMethod.POST,
				requestEntity, ErrorEntity.class);

		assertEquals(actualResponse.getStatusCode(), HttpStatus.BAD_REQUEST);
		assertEquals(actualResponse.getBody().getUserMessage(), "Invalid credit card length - maximum allowed length is 30 and minimum allowed length is 13.");
		assertEquals(actualResponse.getBody().getErrorCode().toString(), "11");
	}

	@Test
	public void testPlainTextMaxLengthIT() {

		vaultRequests.add(new VaultRequest("CREDIT_CARD_NUMBER", "4111111111111111222233333444445", 0));
		vaultRequests.add(new VaultRequest("CREDIT_CARD_NUMBER", "5555555555554440", 1));

		HttpEntity<List> requestEntity = new HttpEntity<List>(vaultRequests, setRequestHeaders());
		ResponseEntity<ErrorEntity> actualResponse = restTemplate.exchange(VAULT_SERVICE_URL, HttpMethod.POST,
				requestEntity, ErrorEntity.class);

		assertEquals(actualResponse.getStatusCode(), HttpStatus.BAD_REQUEST);
		assertEquals(actualResponse.getBody().getUserMessage(), "Invalid credit card length - maximum allowed length is 30 and minimum allowed length is 13.");
		assertEquals(actualResponse.getBody().getErrorCode().toString(), "11");
	}

	@Test
	public void testIndexesNotUniqueIT() {

		vaultRequests.add(new VaultRequest("CREDIT_CARD_NUMBER", "411111111111111", 0));
		vaultRequests.add(new VaultRequest("CREDIT_CARD_NUMBER", "5555555555554440", 0));

		HttpEntity<List> requestEntity = new HttpEntity<List>(vaultRequests, setRequestHeaders());
		ResponseEntity<ErrorEntity> actualResponse = restTemplate.exchange(VAULT_SERVICE_URL, HttpMethod.POST,
				requestEntity, ErrorEntity.class);

		assertEquals(actualResponse.getStatusCode(), HttpStatus.BAD_REQUEST);
		assertEquals(actualResponse.getBody().getUserMessage(), "Indexes are not unique.");
		assertEquals(actualResponse.getBody().getErrorCode().toString(), "1");
	}

	private List<VaultRequest> getRequest() {
		List<VaultRequest> vaultRequests = new ArrayList<VaultRequest>();
		vaultRequests.add(new VaultRequest("CREDIT_CARD_NUMBER", "4111111111111111", 0));
		vaultRequests.add(new VaultRequest("CREDIT_CARD_NUMBER", "5555555555554440", 1));
		return vaultRequests;
	}

	private HttpHeaders setRequestHeaders() {
		HttpHeaders headers = new HttpHeaders();
		headers.setContentType(MediaType.APPLICATION_JSON);
		headers.setAccept(Collections.singletonList(MediaType.APPLICATION_JSON));
		return headers;
	}

}
