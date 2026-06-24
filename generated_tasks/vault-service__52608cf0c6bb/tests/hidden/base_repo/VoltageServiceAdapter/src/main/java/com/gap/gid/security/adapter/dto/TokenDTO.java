package com.gap.gid.security.adapter.dto;

import org.apache.commons.lang.builder.EqualsBuilder;
import org.apache.commons.lang.builder.HashCodeBuilder;

/**
 * Represents a token to the adapter.
 * 
 * @author Hallisson Santos
 * 
 */
public class TokenDTO {

    public TokenDTO(String token) {
        this.token = token;
    }

    public TokenDTO() {

    }

    private String token;
    private String format;
    private String inputValue;
    public static final String DATA_TYPE_TOKEN = "Token";

    /**
     * @return the token
     */
    public String getToken() {
        return token;
    }

    /**
     * @param token the token to set
     */
    public void setToken(String token) {
        this.token = token;
    }

    /**
     * @return the format
     */
    public String getFormat() {
        return format;
    }

    /**
     * @param format the format to set
     */
    public void setFormat(String format) {
        this.format = format;
    }

    /**
     * @return the inputValue
     */
    public String getInputValue() {
        return inputValue;
    }

    /**
     * @param inputValue the inputValue to set
     */
    public void setInputValue(String inputValue) {
        this.inputValue = inputValue;
    }

    @Override
    public String toString() {
        return "TokenDTO [token=" + token + ", format=" + format + ", inputValue=" + inputValue + "]";
    }

    @Override
    public int hashCode() {
        return new HashCodeBuilder().append(token).toHashCode();
    }

    @Override
    public boolean equals(Object obj) {
        if (obj == null) {
            return false;
        }
        if (obj.getClass() != getClass()) {
            return false;
        }
        TokenDTO rhs = (TokenDTO) obj;
        return new EqualsBuilder().append(token, rhs.token).isEquals();
    }
}
