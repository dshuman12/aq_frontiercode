package com.gap.customer.vaultservice.repository.queries;

public class EncryptedDataQueries {

    public static final String GET_ENCRYPTED_DATA_BY_DATA_TYPE_AND_HASH_VALUE = "SELECT ED01T.VLT_ID        as ED01T__VLT_ID, " +
            "ED01T.ECRP_DATA_BINY                     as ED01T__ECRP_DATA_BINY, " +
            "ED01T.DATA_TYP_ECRP_KEY_ID               as ED01T__DATA_TYP_ECRP_KEY_ID, " +
            "ED01T.HASH_DATA_TXT                      as ED01T__HASH_DATA_TXT, " +
            "DTEKT.DATA_TYP_ECRP_KEY_ID               as DTEKT__DATA_TYP_ECRP_KEY_ID, " +
            "ED01T.BFTOKEN                            as ED01T__BFTOKEN, " +
            "ED01T.BFID                               as ED01T__BFID " +
            "FROM ECRP_DATA_01_T ED01T, DATA_TYP_ECRP_KEY_T DTEKT, DATA_TYP_T DTT " +
                "WHERE ED01T.DATA_TYP_ECRP_KEY_ID = DTEKT.DATA_TYP_ECRP_KEY_ID       AND " +
                "DTEKT.DATA_TYP_ID = DTT.DATA_TYP_ID                                 AND " +
                "ED01T.HASH_DATA_TXT = :hashValue AND DTT.DATA_TYP_NM = :dataType";

    public static final String GET_ENCRYPTED_DATA_BY_ID = "SELECT ED01T.VLT_ID      as ED01T__VLT_ID, " +
            "ED01T.ECRP_DATA_BINY                     as ED01T__ECRP_DATA_BINY, " +
            "ED01T.DATA_TYP_ECRP_KEY_ID               as ED01T__DATA_TYP_ECRP_KEY_ID, " +
            "ED01T.HASH_DATA_TXT                      as ED01T__HASH_DATA_TXT, " +
            "DTEKT.DATA_TYP_ECRP_KEY_ID               as DTEKT__DATA_TYP_ECRP_KEY_ID, " +
            "DTT.DATA_TYP_NM                          as DTT__DATA_TYP_NM " +
            "FROM ECRP_DATA_01_T ED01T, DATA_TYP_ECRP_KEY_T DTEKT, DATA_TYP_T DTT " +
            "WHERE ED01T.DATA_TYP_ECRP_KEY_ID = DTEKT.DATA_TYP_ECRP_KEY_ID       AND " +
            "DTT.DATA_TYP_ID = DTEKT.DATA_TYP_ID                                 AND " +
            "ED01T.VLT_ID = :vaultId";

    public static final String INSERT_ENCRYPTED_DATA = "INSERT INTO ECRP_DATA_01_T " +
            "(VLT_ID, ECRP_DATA_BINY, HASH_DATA_TXT, DATA_TYP_ECRP_KEY_ID, CRT_USER_ID, CRT_DTTM, LST_UPDT_USER_ID, LST_UPDT_DTTM) " +
            "VALUES (:id, :cipherText, :hashValue, :dataTypeKeyDataId, :createdByUser, :creationDate, :lastUpdatedByUser, :lastUpdatedDate)";

    public static final String INSERT_ENCRYPTED_DATA_WITH_BLUEFIN = "INSERT INTO ECRP_DATA_01_T " +
            "(VLT_ID, ECRP_DATA_BINY, HASH_DATA_TXT, DATA_TYP_ECRP_KEY_ID, CRT_USER_ID, CRT_DTTM, LST_UPDT_USER_ID, LST_UPDT_DTTM, BFTOKEN, BFID) " +
            "VALUES (:id, :cipherText, :hashValue, :dataTypeKeyDataId, :createdByUser, :creationDate, :lastUpdatedByUser, :lastUpdatedDate, :bfToken, :bfId)";

    public static final String UPDATE_TOKEN = "UPDATE ECRP_DATA_01_T SET BFTOKEN = :bluefinToken, BFID = :bluefinId," +
            "LST_UPDT_DTTM = :lastUpdatedDate, LST_UPDT_USER_ID = :lastUpdatedByUser" +
            " WHERE VLT_ID = :vaultId";
}
