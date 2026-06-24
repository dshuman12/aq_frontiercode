package com.gap.customer.vaultservice.repository.azureSql;

import com.gap.customer.vaultservice.models.Token;
import com.gap.customer.vaultservice.repository.queries.TokenQueries;
import org.springframework.data.jdbc.repository.query.Modifying;
import org.springframework.data.jdbc.repository.query.Query;
import org.springframework.data.relational.core.mapping.Table;
import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;

import java.util.Date;

@Table("ECRP_DATA_04_T")
@Repository
public interface TokenRepository extends CrudRepository<Token, String> {

    @Query(value = TokenQueries.TOKEN_GET_BY_VALUE)
    Token findByVoltageToken(String voltageToken);

    @Query(value = TokenQueries.GET_BY_BLUEFIN_TOKEN)
    Token findByBluefinToken(String bluefinToken);

    @Query(value = TokenQueries.TOKEN_GET_BY_VAULTID)
    Token findByVaultId(String vaultId);

    @Query(value = TokenQueries.TOKEN_GET_BY_VAULTID_WITHOUT_BLUEFIN)
    Token findByVaultIdWithoutBluefin(String vaultId);

    @Modifying
    @Query(value = TokenQueries.INSERT_TOKEN)
    void createToken(String id, String format, String value, String createdByUser, Date creationDate,
                     String lastUpdatedByUser, Date lastUpdatedDate, String bluefinToken, String bluefinId);

    @Modifying
    @Query(value = TokenQueries.UPDATE_TOKEN)
    void updateToken(String vaultId, String bluefinToken, String bluefinId, Date lastUpdatedDate, String lastUpdatedByUser);

    @Query(value = TokenQueries.CHECK_CONNECTION_ALIVE_AZURE)
    boolean isConnectionAlive();

    @Query(value = TokenQueries.TOKEN_GET_BY_VOLTAGE_WITHOUT_BLUEFIN)
    Token findByVoltageTokenWithoutBluefin(String voltageToken);
}

