package com.gap.customer.vaultservice.repository;

import com.gap.customer.vaultservice.dto.PasswordResultDTO;
import com.gap.customer.vaultservice.repository.azureSql.PasswordRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.data.jdbc.DataJdbcTest;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.test.context.junit.jupiter.SpringExtension;

import java.math.BigDecimal;
import java.util.Date;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;

@DataJdbcTest
@ExtendWith(SpringExtension.class)
public class PasswordRepositoryTest {

    @Autowired
    PasswordRepository passwordRepository;

    @Test
    void testGetByDataTypeAndHashValue() {
        PasswordResultDTO passwordResultDTO = passwordRepository.getByDataTypeAndHashValue("iHPcAxbxJ0PNUeuGy7f9gBBAf1Y=", "Password");

        assertNotNull(passwordResultDTO);
        assertEquals("275B2676EB62204E61B7389377C71937", passwordResultDTO.getVaultId());
        assertEquals("1064022616", passwordResultDTO.getDataTypeEncryptedKeyId());
        assertEquals("iHPcAxbxJ0PNUeuGy7f9gBBAf1Y=", passwordResultDTO.getHashValue());
    }

    @Test
    void testGetByDataTypeAndHashValueRetunNullWhenDataNotFound() {
        PasswordResultDTO passwordResultDTO = passwordRepository.getByDataTypeAndHashValue("tHPcAxbxJ0PNUeuGy7f9gBBAf1Y=", "Password");

        assertNull(passwordResultDTO);
    }

    @Test
    void testGetByVaultId() {
        PasswordResultDTO passwordResultDTO = passwordRepository.getByVaultId("275B2676EB62204E61B7389377C71937");

        assertNotNull(passwordResultDTO);
        assertEquals("1064022616", passwordResultDTO.getDataTypeEncryptedKeyId());
        assertEquals("iHPcAxbxJ0PNUeuGy7f9gBBAf1Y=", passwordResultDTO.getHashValue());
    }

    @Test
    void testGetByVaultIdReturnNullWhenDataNotFound() {
        PasswordResultDTO passwordResultDTO = passwordRepository.getByVaultId("375B2676EB62204E61B7389377C71937");

        assertNull(passwordResultDTO);
    }

    @Test
    void testInsert() {
        byte[] cipherText = {(byte) 123456};
        Date date= new Date();

        boolean isInserted = passwordRepository.insert("575B2676EB62204E61B7389377C71937", cipherText, "pHPcAxbxJ0PNUeuGy7f9gBBAf1Y=",
                BigDecimal.valueOf(2064022616), "test-user-id",
                date, "test-user-id", date);

        assertTrue(isInserted);
        assertEquals(3, passwordRepository.count());
    }

    @Test
    void testInsertFailsWhenGivenDataNotUnique() {
        byte[] cipherText = {(byte) 123456};
        Date date= new Date();

        assertThrows(DuplicateKeyException.class, () -> {
            passwordRepository.insert("275B2676EB62204E61B7389377C71937", cipherText, "pHPcAxbxJ0PNUeuGy7f9gBBAf1Y=",
                    BigDecimal.valueOf(2064022616), "test-user-id",
                    date, "test-user-id", date);
        });

        assertEquals(2, passwordRepository.count());
    }
}
