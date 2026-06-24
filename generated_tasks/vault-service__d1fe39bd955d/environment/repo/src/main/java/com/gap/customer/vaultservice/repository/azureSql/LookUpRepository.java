package com.gap.customer.vaultservice.repository.azureSql;

import com.gap.customer.vaultservice.dto.LookUpDataDTO;
import com.gap.customer.vaultservice.repository.queries.LookUpQueries;
import org.springframework.data.jdbc.repository.query.Modifying;
import org.springframework.data.jdbc.repository.query.Query;
import org.springframework.data.relational.core.mapping.Table;
import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;

@Table("LOOKUP_DATA")
@Repository
public interface LookUpRepository extends CrudRepository<LookUpDataDTO, String> {

    @Modifying
    @Query(LookUpQueries.UPDATE_FLAG)
    void updateFlag(String lookupKey, String lookupValue);

}
