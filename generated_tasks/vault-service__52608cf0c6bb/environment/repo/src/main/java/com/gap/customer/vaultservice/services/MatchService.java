package com.gap.customer.vaultservice.services;

import com.gap.customer.vaultservice.exception.VaultServiceException;
import com.gap.customer.vaultservice.models.MatchRequest;
import com.gap.customer.vaultservice.models.MatchResponse;
import org.springframework.http.ResponseEntity;

import java.util.Map;

public interface MatchService {

    ResponseEntity<MatchResponse> match(MatchRequest matchRequest, Map<String, String> headers) throws VaultServiceException;
}
