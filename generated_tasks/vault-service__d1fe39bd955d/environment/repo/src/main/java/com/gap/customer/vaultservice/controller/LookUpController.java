package com.gap.customer.vaultservice.controller;

import com.gap.customer.vaultservice.Validators.LookUpValidator;
import com.gap.customer.vaultservice.exception.ValidationException;
import com.gap.customer.vaultservice.dto.LookUpDataDTO;
import com.gap.customer.vaultservice.models.LookUpData;
import com.gap.customer.vaultservice.models.LookUpResponse;
import com.gap.customer.vaultservice.services.LookUpService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.validation.Valid;
import java.util.List;

@Slf4j
@RestController
@RequestMapping(value = "/lookUp")

@RequiredArgsConstructor
public class LookUpController {

    private final LookUpValidator lookUpValidator;
    private final LookUpService lookUpService;

    @PostMapping(consumes = "application/json", produces = "application/json")
    public ResponseEntity<LookUpResponse> updatBluefinFlag(@RequestBody @Valid List<LookUpData> lookUpRequestList) throws ValidationException {
        if (log.isDebugEnabled()) {
            log.info("Received request to update the flag(s)");
        }
        lookUpValidator.validate(lookUpRequestList);
        lookUpService.updateLookUpData(lookUpRequestList);
        return new ResponseEntity<>(HttpStatus.OK);
    }

    @GetMapping(produces = "application/json")
    public ResponseEntity<List<LookUpDataDTO>> getLookUpData() {
        if (log.isDebugEnabled()) {
            log.info("Received request to fetch the flag(s)");
        }
        List<LookUpDataDTO> lookUpDataDTOResponse = lookUpService.getLookUpData();
        return new ResponseEntity(lookUpDataDTOResponse, HttpStatus.OK);
    }

}
