package com.gap.customer.vaultservice.repository.queries;

public class TokenQueries {
    public static final String TOKEN_GET_BY_VALUE = "SELECT * FROM ECRP_DATA_04_T WHERE PMT_ACCT_TOKN_NBR = :voltageToken";

    public static final String GET_BY_BLUEFIN_TOKEN = "SELECT * FROM ECRP_DATA_04_T WHERE BFTOKEN = :bluefinToken";

    public static final String TOKEN_GET_BY_VAULTID = "SELECT * FROM ECRP_DATA_04_T WHERE VLT_ID = :vaultId";


    public static final String INSERT_TOKEN = "INSERT INTO  ECRP_DATA_04_T (VLT_ID, TOKN_FRMT_TXT, PMT_ACCT_TOKN_NBR, " +
            "CRT_USER_ID, CRT_DTTM, LST_UPDT_USER_ID, LST_UPDT_DTTM, BFTOKEN, BFID) " +
            "VALUES (:id, :format, :value, :createdByUser, :creationDate, :lastUpdatedByUser, " +
            ":lastUpdatedDate, :bluefinToken, :bluefinId)";

    public static final String UPDATE_TOKEN = "UPDATE ECRP_DATA_04_T SET BFTOKEN = :bluefinToken, BFID = :bluefinId," +
            "LST_UPDT_DTTM = :lastUpdatedDate, LST_UPDT_USER_ID = :lastUpdatedByUser" +
            " WHERE VLT_ID = :vaultId";

    public static final String CHECK_CONNECTION_ALIVE_AZURE = "SELECT 1";

    public static final String TOKEN_GET_BY_VAULTID_WITHOUT_BLUEFIN = "SELECT VLT_ID, TOKN_FRMT_TXT, PMT_ACCT_TOKN_NBR " +
            "FROM ECRP_DATA_04_T WHERE VLT_ID = :vaultId";

    public static final String TOKEN_GET_BY_VOLTAGE_WITHOUT_BLUEFIN = "SELECT VLT_ID, TOKN_FRMT_TXT, PMT_ACCT_TOKN_NBR " +
            "FROM ECRP_DATA_04_T WHERE PMT_ACCT_TOKN_NBR = :voltageToken";
}
