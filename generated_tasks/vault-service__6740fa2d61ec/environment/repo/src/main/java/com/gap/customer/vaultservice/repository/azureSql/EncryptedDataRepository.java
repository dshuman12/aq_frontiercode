package com.gap.customer.vaultservice.repository.azureSql;

import com.gap.customer.vaultservice.dto.EncryptedDataResultDTO;
import com.gap.customer.vaultservice.models.EncryptedData;
import com.gap.customer.vaultservice.repository.queries.EncryptedDataQueries;
import com.gap.customer.vaultservice.repository.queries.TokenQueries;
import org.springframework.data.jdbc.repository.query.Modifying;
import org.springframework.data.jdbc.repository.query.Query;
import org.springframework.data.relational.core.mapping.Table;
import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.Date;

@Table("ECRP_DATA_01_T")
@Repository
public interface EncryptedDataRepository extends CrudRepository<EncryptedData, String> {

    @Query(value = EncryptedDataQueries.GET_ENCRYPTED_DATA_BY_DATA_TYPE_AND_HASH_VALUE)
    EncryptedDataResultDTO getEncryptedDataByDataTypeAndHashValue(String hashValue, String dataType);

    @Query(value = EncryptedDataQueries.GET_ENCRYPTED_DATA_BY_ID)
    EncryptedDataResultDTO getEncryptedDataByVaultId(String vaultId);

    @Modifying
    @Query(value = EncryptedDataQueries.INSERT_ENCRYPTED_DATA)
    void insertEncryptedData(String id, byte[] cipherText, String hashValue, BigDecimal dataTypeKeyDataId,
                             String createdByUser, Date creationDate, String lastUpdatedByUser, Date lastUpdatedDate);

    @Modifying
    @Query(value = EncryptedDataQueries.INSERT_ENCRYPTED_DATA_WITH_BLUEFIN)
    void insertEncryptedDataWithBluefin(String id, byte[] cipherText, String hashValue, BigDecimal dataTypeKeyDataId,
                             String createdByUser, Date creationDate, String lastUpdatedByUser, Date lastUpdatedDate,
                             String bfToken, String bfId);

    @Modifying
    @Query(value = EncryptedDataQueries.UPDATE_TOKEN)
    void updateToken(String vaultId, String bluefinToken, String bluefinId, Date lastUpdatedDate, String lastUpdatedByUser);

}