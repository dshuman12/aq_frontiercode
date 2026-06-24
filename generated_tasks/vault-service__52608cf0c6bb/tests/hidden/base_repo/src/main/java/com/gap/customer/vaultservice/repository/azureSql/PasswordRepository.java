package com.gap.customer.vaultservice.repository.azureSql;

import com.gap.customer.vaultservice.models.Password;
import com.gap.customer.vaultservice.dto.PasswordResultDTO;
import com.gap.customer.vaultservice.repository.queries.PasswordQueries;
import org.springframework.data.jdbc.repository.query.Modifying;
import org.springframework.data.jdbc.repository.query.Query;
import org.springframework.data.relational.core.mapping.Table;
import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.Date;

@Table("ECRP_DATA_03_T")
@Repository
public interface PasswordRepository extends CrudRepository<Password, String> {
    
    @Query(value = PasswordQueries.GET_BY_DATA_TYPE_AND_HASH_VALUE)
    PasswordResultDTO getByDataTypeAndHashValue(String hashValue, String dataType);
    
    @Query(value = PasswordQueries.GET_BY_VAULT_ID)
    PasswordResultDTO getByVaultId(String vaultId);
    
    @Modifying
    @Query(value = PasswordQueries.INSERT)
    boolean insert(String vaultId, byte[] cipherText, String hashValue, BigDecimal dataTypeKeyDataId, String createdByUser,
                   Date creationDate, String lastUpdatedByUser, Date lastUpdatedDate);
}
