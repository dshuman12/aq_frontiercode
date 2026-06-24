package com.gap.customer.vaultservice.repository;

import com.gap.customer.vaultservice.models.Token;
import com.gap.customer.vaultservice.repository.azureSql.TokenRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.data.jdbc.DataJdbcTest;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.test.context.junit.jupiter.SpringExtension;

import java.text.Format;
import java.text.SimpleDateFormat;
import java.util.Date;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

@ExtendWith(SpringExtension.class)
@DataJdbcTest
public class TokenRepositoryTest {

    @Autowired
    TokenRepository tokenRepository;

    @Test
    void testFindByVoltageToken() {
        Token token = tokenRepository.findByVoltageToken("123456789987654321");

        assertNotNull(token);
        assertEquals("VAULTID1", token.getVaultId());
    }

    @Test
    void testFindByVoltageTokenWithoutBluefin() {
        Token token = tokenRepository.findByVoltageTokenWithoutBluefin("123456789987654321");

        assertNotNull(token);
        assertEquals("VAULTID1", token.getVaultId());
    }

    @Test
    void testFindByVoltageTokenWhenNoDataFound() {
        Token token = tokenRepository.findByVoltageToken("323456789987654321");

        assertNull(token);
    }

    @Test
    void testFindByVoltageWithoutBluefinTokenWhenNoDataFound() {
        Token token = tokenRepository.findByVoltageTokenWithoutBluefin("323456789987654321");

        assertNull(token);
    }

    @Test
    void testCreateToken() {

        Date date = new Date();

        tokenRepository.createToken("GB2E530ACF7AFE8FD5909F4E256FD36B", "firstsixlastfour",
                "6632766592059149", "test-user-id",
                date, "test-user-id", date, "6632766596579149",
                "djI6MTIwMjIwMjE1MDg0NDIyMTAzMzk4MTYxMHxiYzVkMDU3YjUwMzkyMDA3N2JkZjBiZmE3ODVhYWU2Znx8fA==");

        assertEquals(6, tokenRepository.count());
    }

    @Test
    void testInsertFailsWhenGivenDataNotUnique() {
        Date date= new Date();

        assertThrows(DuplicateKeyException.class, () -> {
            tokenRepository.createToken("VAULTID1", "firstsixlastfour",
                    "6632766592059149", "test-user-id",
                    date, "test-user-id", date, "6632766596579149", 
                    "djI6MTIwMjIwMjE1MDg0NDIyMTAzMzk4MTYxMHxiYzVkMDU3YjUwMzkyMDA3N2JkZjBiZmE3ODVhYWU2Znx8fA==");
        });

        assertEquals(5, tokenRepository.count());
    }

    @Test
    void testUpdateToken() {
        Date date = new Date();
        Format formatter = new SimpleDateFormat("yyyy-MM-dd");
        tokenRepository.updateToken("VAULTID3", "6632766596579149",
                "djI6MTIwMjIwMjE1MDg0NDIyMTAzMzk4MTYxMHxiYzVkMDU3YjUwMzkyMDA3N2JkZjBiZmE3ODVhYWU2Znx8fA==",
                date, "test-user-id");
        Token token = tokenRepository.findByVoltageToken("123456789987654323");

        assertEquals(5, tokenRepository.count());
        assertEquals("6632766596579149", token.getBluefinToken());
        assertEquals("djI6MTIwMjIwMjE1MDg0NDIyMTAzMzk4MTYxMHxiYzVkMDU3YjUwMzkyMDA3N2JkZjBiZmE3ODVhYWU2Znx8fA==",
                token.getBluefinId());
        assertEquals("test-user-id", token.getLastUpdatedByUserId());
        assertEquals(formatter.format(date), token.getLastUpdatedDateAndTime().toString());
    }

    @Test
    void testFindByVaultIdWithoutBluefin() {
        Token token = tokenRepository.findByVaultIdWithoutBluefin("VAULTID1");

        assertEquals("VAULTID1", token.getVaultId());
        assertEquals("123456789987654321", token.getVoltageToken());
        assertNull(token.getBluefinToken());
        assertNull(token.getBluefinId());
    }

    @Test
    void testFindByBluefinTokenAndId() {
        Token token = tokenRepository.findByBluefinToken("123456789987654321");

        assertNotNull(token);
        assertEquals("VAULTID1", token.getVaultId());
    }

    @Test
    void testFindByBluefinTokenAndIdWhenNoDataFound() {
        Token token = tokenRepository.findByBluefinToken("invalidToken");

        assertNull(token);
    }
}
