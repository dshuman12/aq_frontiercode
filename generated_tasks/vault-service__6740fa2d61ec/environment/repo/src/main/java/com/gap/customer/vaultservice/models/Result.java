package com.gap.customer.vaultservice.models;

public class Result {

    private final boolean success;

    public Result(boolean isSuccessful) {
        this.success = isSuccessful;
    }

    public boolean isSuccess() {
        return success;
    }
}
