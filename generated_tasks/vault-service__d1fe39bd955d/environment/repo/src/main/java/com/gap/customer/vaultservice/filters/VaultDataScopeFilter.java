package com.gap.customer.vaultservice.filters;

import com.gap.customer.vaultservice.error.ErrorEntityCodes;
import com.gap.customer.vaultservice.exception.ValidationException;
import com.gap.customer.vaultservice.models.VaultDataScopeConfig;
import com.gap.customer.vaultservice.models.VaultSearchRequest;
import com.gap.customer.vaultservice.services.ServiceHeaders;
import com.gap.customer.vaultservice.util.VaultConstants;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import javax.servlet.http.HttpServletRequest;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Component;

@Component
@Slf4j
@AllArgsConstructor
public class VaultDataScopeFilter implements ServiceHeaders {

    private final VaultDataScopeConfig vaultDataScopeConfig;

    private Set<String> getUniqueReturnTypeForRequests(List<VaultSearchRequest> vaultSearchRequests) {
        return vaultSearchRequests.stream()
                .map(VaultSearchRequest::getReturnType)
                .collect(Collectors.toSet());

    }

    private List<String> filterDataScope(String dataScope) {
        var dataScopes = StringUtils.stripAll(dataScope.split(","));
        var dataScopeList = Arrays.asList(dataScopes);
        var filteredList = new ArrayList<String>();

        if (!dataScopeList.isEmpty()) {
            if (dataScopeList.stream().anyMatch(VaultConstants.DATA_SCOPE_CREDIT_CARD::equalsIgnoreCase)) {
                filteredList.addAll(vaultDataScopeConfig.getCreditcard());
            }
            if (dataScopeList.stream().anyMatch(VaultConstants.DATA_SCOPE_GIFT_CARD::equalsIgnoreCase)) {
                filteredList.addAll(vaultDataScopeConfig.getGiftcard());
            }
            if (dataScopeList.stream().anyMatch(VaultConstants.DATA_SCOPE_TOKEN::equalsIgnoreCase)) {
                filteredList.add(vaultDataScopeConfig.getToken());
            }
        }
        return filteredList;
    }

    public void lookupRequestsWithFilter(List<String> filteredList, List<VaultSearchRequest> vaultSearchRequests) throws ValidationException {
        var uniqueReturnTypes = getUniqueReturnTypeForRequests(vaultSearchRequests);
        if (uniqueReturnTypes.stream().anyMatch(filterType -> !filteredList.contains(filterType))) {
            throw new ValidationException(ErrorEntityCodes.INVALID_RETURN_TYPE_FOR_SCOPES);
        }
    }
    
    public void lookUpVaultSearchFilter(List<VaultSearchRequest> vaultSearchRequests, HttpServletRequest request) throws ValidationException {
        String dataScope = getDataScopeHeaders(request).get(VaultConstants.DATA_SCOPE_HEADER);
        if (dataScope.isEmpty()) {
            throw new ValidationException(ErrorEntityCodes.INVALID_REQUEST);
        }
        var filteredList = filterDataScope(dataScope);
        lookupRequestsWithFilter(filteredList, vaultSearchRequests);
    }
}
