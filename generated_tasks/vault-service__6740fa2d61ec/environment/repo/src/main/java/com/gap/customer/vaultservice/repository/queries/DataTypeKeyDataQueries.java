package com.gap.customer.vaultservice.repository.queries;

public class DataTypeKeyDataQueries {

    public static final String DATA_TYPE_KEY_DATA_GET_BY_VALID_DATE_AND_DATA_TYPE =
        "SELECT DTEKT.DATA_TYP_ECRP_KEY_ID    as DTEKT__DATA_TYP_ECRP_KEY_ID," +
                "DTEKT.KEY_EFF_END_DT         as DTEKT__KEY_EFF_END_DT," +
                "DTEKT.KEY_EFF_STRT_DT        as DTEKT__KEY_EFF_STRT_DT," +
                "DTEKT.HASH_ALGR_ID           as DTEKT__HASH_ALGR_ID," +
                "DTEKT.DATA_TYP_ID            as DTEKT__DATA_TYP_ID," +
                "DTEKT.ECRP_KEY_ID            as DTEKT__ECRP_KEY_ID," +
                "DTEKT.CRT_DTTM               as DTEKT__CRT_DTTM," +
                "DTEKT.LST_UPDT_DTTM          as DTEKT__LST_UPDT_DTTM," +
                "DTEKT.LST_UPDT_USER_ID       as DTEKT__LST_UPDT_USER_ID," +
                "HAT.HASH_ALGR_ID             as HAT__HASH_ALGR_ID," +
                "HAT.HASH_ALGR_NM             as HAT__HASH_ALGR_NM," +
                "EKT.ECRP_KEY_ID              as EKT__ECRP_KEY_ID," +
                "EKT.KEY_PVDR_NM              as EKT__KEY_PVDR_NM," +
                "EKT.KEY_ALGR_TXT             as EKT__KEY_ALGR_TXT," +
                "EKT.KEY_NM                   as EKT__KEY_NM," +
                "EKT.INI_VCTR_BINY            as EKT__INI_VCTR_BINY," +
                "DTT.DATA_TYP_ID              as DTT__DATA_TYP_ID," +
                "DTT.DATA_TYP_NM              as DTT__DATA_TYP_NM " +
        "FROM DATA_TYP_T DTT, DATA_TYP_ECRP_KEY_T DTEKT " +
                "LEFT OUTER JOIN  HASH_ALGR_T HAT ON HAT.HASH_ALGR_ID = DTEKT.HASH_ALGR_ID " +
                "LEFT OUTER JOIN ECRP_KEY_T EKT ON EKT.ECRP_KEY_ID = DTEKT.ECRP_KEY_ID " +
        "WHERE DTEKT.DATA_TYP_ID = DTT.DATA_TYP_ID AND " +
                "DTT.DATA_TYP_NM = :dataType       AND  " +
                "DTEKT.KEY_EFF_STRT_DT < :currentDate  AND  " +
                "DTEKT.KEY_EFF_END_DT > :currentDateDup " +
        "ORDER BY DTEKT__CRT_DTTM DESC";
}


