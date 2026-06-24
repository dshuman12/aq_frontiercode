package com.gap.customer.vaultservice.Validators;

import com.gap.customer.vaultservice.error.ErrorEntityCodes;
import com.gap.customer.vaultservice.exception.ValidationException;
import com.gap.customer.vaultservice.models.LookUpData;
import com.gap.customer.vaultservice.util.VaultConstants;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class LookUpValidator {

    public void validate(List<LookUpData> lookUpRequestList) throws ValidationException {
        for(var lookUpRequest : lookUpRequestList){
            if (StringUtils.isBlank(lookUpRequest.getLookupKey()) || lookUpRequest.getLookupValue() == null ||
                    !VaultConstants.lookUpFlags.contains(lookUpRequest.getLookupKey())) {
                throw new ValidationException(ErrorEntityCodes.INVALID_LOOKUP_DATA);
            }
        }
    }
}
