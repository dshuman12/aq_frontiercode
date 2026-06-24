package com.gap.customer.vaultservice.models;

import lombok.*;

import java.util.List;

@Getter
@Setter
public class VaultDataScopeConfig {

    private String name;
    private List<String>  creditcard;
    private List<String>  giftcard;
    private String token;
}
