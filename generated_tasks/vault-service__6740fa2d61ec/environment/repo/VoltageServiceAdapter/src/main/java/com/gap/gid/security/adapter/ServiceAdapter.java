package com.gap.gid.security.adapter;

import com.gap.gid.security.adapter.dto.TokenDTO;

import java.util.List;

/**
 * Interface for all the Adapters, used mainly to tokenize and detokenize data.
 *
 * @author Hallisson Santos
 *
 */
public interface ServiceAdapter {

    /**
     * Tokenizes the input data
     *
     * @param input - Raw input String
     * @return token as complex object containing all the necessary data related to the token
     */
    TokenDTO tokenize(String input);

    /**
     * DeTokenizes the token
     *
     * @param token as complex object containing all the necessary data related to the token
     * @return String representation of the DeTokenized data
     */
    String deTokenize(TokenDTO token);

    /**
     * Create a token list based on the provided data
     *
     * @param data
     * - the data to be tokenized by the tokenizer service
     *
     * @return - Representational state of the token
     */
    List<String> tokenize(List<String> data);

    /**
     * Generates a list of raw data value from representational state of the tokens
     *
     * @param Representational state of the token
     *
     * @return - The raw data value from representational state of the token
     */
    List<String> deTokenize(List<String> data);

    /**
     * Returns the default format used by the client
     *
     * @return Format
     */
    String getFormat();
}
