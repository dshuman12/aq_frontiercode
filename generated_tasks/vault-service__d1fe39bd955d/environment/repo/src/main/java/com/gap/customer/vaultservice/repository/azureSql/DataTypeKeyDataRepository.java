package com.gap.customer.vaultservice.repository.azureSql;

import com.gap.customer.vaultservice.models.DataTypeKeyData;
import com.gap.customer.vaultservice.dto.DataTypeKeyDataResultDTO;
import org.springframework.data.jdbc.repository.query.Modifying;
import org.springframework.data.jdbc.repository.query.Query;
import org.springframework.data.relational.core.mapping.Table;
import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.Date;
import java.util.List;

import static com.gap.customer.vaultservice.repository.queries.DataTypeKeyDataQueries.DATA_TYPE_KEY_DATA_GET_BY_VALID_DATE_AND_DATA_TYPE;

@Table("DATA_TYP_ECRP_KEY_T")
@Repository
public interface DataTypeKeyDataRepository extends CrudRepository<DataTypeKeyData, BigDecimal> {

    @Query(value = DATA_TYPE_KEY_DATA_GET_BY_VALID_DATE_AND_DATA_TYPE)
    List<DataTypeKeyDataResultDTO> getDataTypeKeyDataGetByValidDateAndDataType(String dataType, Date currentDate, Date currentDateDup);

}
