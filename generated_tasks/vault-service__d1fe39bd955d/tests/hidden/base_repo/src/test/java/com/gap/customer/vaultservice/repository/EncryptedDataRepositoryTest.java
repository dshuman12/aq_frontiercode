package com.gap.customer.vaultservice.repository;

import com.gap.customer.vaultservice.models.EncryptedData;
import com.gap.customer.vaultservice.dto.EncryptedDataResultDTO;
import com.gap.customer.vaultservice.repository.azureSql.EncryptedDataRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.data.jdbc.DataJdbcTest;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import java.math.BigDecimal;
import java.util.Date;
import java.util.Optional;

import static org.junit.Assert.assertNull;
import static org.junit.jupiter.api.Assertions.*;

@ExtendWith(SpringExtension.class)
@DataJdbcTest
public class EncryptedDataRepositoryTest {

    @Autowired
    EncryptedDataRepository encryptedDataRepository;

    @Test
    void testGetEncryptedDataByDataTypeAndHashValue() {
        EncryptedDataResultDTO encryptedDataResultDTO = encryptedDataRepository.getEncryptedDataByDataTypeAndHashValue("uHPcAxbxJ0PNUeuGy7f9gBBAf1Y=", "GiftCardNumber");

        assertNotNull(encryptedDataResultDTO);
        assertEquals("675B2676EB62204E61B7389377C71937", encryptedDataResultDTO.getVaultId());
    }

    @Test
    void testGetEncryptedDataByDataTypeAndHashValueReturnNullWhenNoDataFound() {
        EncryptedDataResultDTO encryptedDataResultDTO = encryptedDataRepository.getEncryptedDataByDataTypeAndHashValue("test-hash-text", "GiftCardNumber");

        assertNull(encryptedDataResultDTO);
    }

    @Test
    void testGetEncryptedDataByVaultId() {
        EncryptedDataResultDTO encryptedDataResultDTO = encryptedDataRepository.getEncryptedDataByVaultId("675B2676EB62204E61B7389377C71937");

        assertNotNull(encryptedDataResultDTO);
        BigDecimal expectedKeyId = new BigDecimal(808409643);
        assertEquals(expectedKeyId, encryptedDataResultDTO.getDataTypeKeyDataId());
    }

    @Test
    void testGetEncryptedDataByVaultIdReturnsNullWhenNoDataFound() {
        EncryptedDataResultDTO encryptedDataResultDTO = encryptedDataRepository.getEncryptedDataByVaultId("test-vault-id");

        assertNull(encryptedDataResultDTO);
    }

    @Test
    void testInsertEncryptedData() {
        Date date= new Date();
        byte[] cipherText = {(byte) 323456};

        encryptedDataRepository.insertEncryptedData("775B2676EB62204E61B7389377C71937", cipherText,
                "uHPcAxbxJ0PNUeuGy7f9gBBAf1Y=", BigDecimal.valueOf(358597245),
                 "test-user-id", date, "test-user-id", date);

        assertEquals(9, encryptedDataRepository.count());
    }

    @Test
    void testInsertFailsWhenGivenDataNotUnique() {
        Date date= new Date();
        byte[] cipherText = {(byte) 323456};

        assertThrows(DuplicateKeyException.class, () -> {
            encryptedDataRepository.insertEncryptedData("675B2676EB62204E61B7389377C71937", cipherText,
                    "uHPcAxbxJ0PNUeuGy7f9gBBAf1Y=", BigDecimal.valueOf(358597245),
                    "test-user-id", date, "test-user-id", date);
        });

        assertEquals(8, encryptedDataRepository.count());
    }
}
