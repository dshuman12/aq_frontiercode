package com.gap.customer.vaultservice.repository.queries;

public class PasswordQueries {
    public static final String GET_BY_DATA_TYPE_AND_HASH_VALUE = "SELECT ED03T.VLT_ID, " +
            "ED03T.ECRP_DATA_BINY, " +
            "ED03T.DATA_TYP_ECRP_KEY_ID, " +
            "ED03T.HASH_DATA_TXT " +
            "FROM ECRP_DATA_03_T ED03T, DATA_TYP_ECRP_KEY_T DTEKT, DATA_TYP_T DTT " +
            "WHERE ED03T.DATA_TYP_ECRP_KEY_ID = DTEKT.DATA_TYP_ECRP_KEY_ID AND DTEKT.DATA_TYP_ID = DTT.DATA_TYP_ID AND " +
            "ED03T.HASH_DATA_TXT = :hashValue AND DTT.DATA_TYP_NM = :dataType";
    
    public static final String GET_BY_VAULT_ID = "SELECT ED03T.VLT_ID, " +
            "ED03T.ECRP_DATA_BINY, " +
            "ED03T.DATA_TYP_ECRP_KEY_ID, " +
            "ED03T.HASH_DATA_TXT " +
            "FROM ECRP_DATA_03_T ED03T, DATA_TYP_ECRP_KEY_T DTEKT " +
            "WHERE ED03T.DATA_TYP_ECRP_KEY_ID = DTEKT.DATA_TYP_ECRP_KEY_ID AND ED03T.VLT_ID = :vaultId";
    
    public static final String INSERT = "INSERT INTO  ECRP_DATA_03_T " +
            "(VLT_ID, ECRP_DATA_BINY, HASH_DATA_TXT, DATA_TYP_ECRP_KEY_ID, CRT_USER_ID, CRT_DTTM," +
            "LST_UPDT_USER_ID, LST_UPDT_DTTM) " +
            "VALUES (:vaultId, :cipherText, :hashValue, :dataTypeKeyDataId, :createdByUser, :creationDate," +
            ":lastUpdatedByUser, :lastUpdatedDate)";
}
