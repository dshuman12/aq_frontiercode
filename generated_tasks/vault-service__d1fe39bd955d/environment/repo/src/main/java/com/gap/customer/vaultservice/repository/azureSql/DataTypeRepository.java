package com.gap.customer.vaultservice.repository.azureSql;

import com.gap.customer.vaultservice.models.DataType;
import com.gap.customer.vaultservice.dto.DataTypeResultDTO;
import org.springframework.data.jdbc.repository.query.Query;
import org.springframework.data.relational.core.mapping.Table;
import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;

import java.math.BigInteger;
import java.util.List;

@Table("DATA_TYP_T")
@Repository
public interface DataTypeRepository extends CrudRepository<DataType, BigInteger> {
    @Query("SELECT DATA_TYP_ID, DATA_TYP_NM FROM DATA_TYP_T")
    List<DataTypeResultDTO> dataTypeGetAll();
}
