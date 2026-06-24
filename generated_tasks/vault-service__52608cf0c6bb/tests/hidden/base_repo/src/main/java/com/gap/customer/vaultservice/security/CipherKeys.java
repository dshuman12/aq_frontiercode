package com.gap.customer.vaultservice.security;

import com.gap.customer.vaultservice.dto.DataTypeKeyDataResultDTO;
import com.gap.customer.vaultservice.dto.DataTypeResultDTO;
import com.gap.customer.vaultservice.models.VaultFeatureToggle;
import com.ingrian.security.nae.IngrianProvider;
import com.ingrian.security.nae.NAEKey;
import com.ingrian.security.nae.NAESession;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.security.Security;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Properties;

@Component
@Slf4j
public class CipherKeys {
    // CodeReview2: log
    private static final CipherLogger LOGGER = new CipherLogger();
    private static CipherKeys instance = null;

    private Map dataTypeDigestMap = new HashMap();
    private Map keyMap = new HashMap();
    private DataTypeUtil dataTypeUtil;
    private DataTypeKeyDataUtil dataTypeKeyDataUtil;

    private NAESession naeSession;
    private Properties serverProps;
    private Properties ingrianProps;


    public static CipherKeys getInstance(DataTypeUtil dataTypeUtil, DataTypeKeyDataUtil dataTypeKeyDataUtil,
                                         Properties serverProps, Properties ingrianProps,
                                         VaultFeatureToggle vaultFeatureToggle) {

        if (instance == null) {
            instance = new CipherKeys(dataTypeUtil, dataTypeKeyDataUtil, serverProps, ingrianProps, vaultFeatureToggle);
        }

        return instance;
    }

    private CipherKeys(DataTypeUtil dataTypeUtil, DataTypeKeyDataUtil dataTypeKeyDataUtil, Properties serverProps,
                       Properties ingrianProps, VaultFeatureToggle vaultFeatureToggle){
        this.dataTypeUtil = dataTypeUtil;
        this.dataTypeKeyDataUtil = dataTypeKeyDataUtil;
        this.ingrianProps = ingrianProps;
        this.serverProps = serverProps;
        initialize();
    }


    protected void setIngrianPropertiesAsSystemProperties() {
        String basePropertyName = "com.ingrian.security.nae.";
        Iterator propertiesIterator = ingrianProps.entrySet().iterator();
        String propertyName = null;
        while (propertiesIterator.hasNext()) {
            Map.Entry entry = (Map.Entry) propertiesIterator.next();
            propertyName = basePropertyName + (String) entry.getKey();
            // CodeReview2: log at denug level. Combine log output in one line
            log.info("the property name is" +  propertyName);
            log.info("the entry value" + entry.getValue());
            System.setProperty(propertyName, (String) entry.getValue());
        }
    }

    private void initialize() {
        try {
            setIngrianPropertiesAsSystemProperties();
            Security.addProvider(new IngrianProvider(new CipherLogger()));


            String ingrianUserName = serverProps.getProperty("Ingrian_Username");
            String ingrianPassword = serverProps.getProperty("Ingrian_Password");
            // CodeReview2: log at denug level. Combine log output in one line
            log.info(ingrianUserName+ "::"+ ingrianPassword);

            if (ingrianUserName == null || ingrianPassword == null) {
                // CodeReview2: Whatever we are logging should go to server.log
                LOGGER.error("[VOLT0102] - Could not find either the username or password in order to connect to "
                   + "Ingrian NAE Cluster - check vaultserver.properties file");
            }
             LOGGER.info("[VOLT0700] - Attaching to the Ingrian cluster with username=" + ingrianUserName
            + " and password=" + ingrianPassword);
             LOGGER.info("System properties: " + System.getProperties());
            naeSession = NAESession.getSession(ingrianUserName, ingrianPassword.toCharArray());
        } catch (Exception e) {
            LOGGER.error("[VOLT0104] - Error occured while initializing CipherManager", e);
        }
        initializeKeys(naeSession);
    }

    /**
     * Find out which keys to use for which datatypes - add new keys on the fly when rotated*/


    private void initializeKeys(NAESession naeSession) {

        final String methodSignature = "void initializeKeys(NAESession): ";

        try {
            // Start ibatis way

            List dataTypeList = dataTypeUtil.DataTypeList();
            if (null != dataTypeList && dataTypeList.size() > 0) {
                for (Iterator i = dataTypeList.iterator(); i.hasNext();) {
                    DataTypeResultDTO data = (DataTypeResultDTO) i.next();
                    String dataType = data.getDataTypeName();
                    if (LOGGER.isDebugEnabled()) {
                        LOGGER.debug(methodSignature + "dataType: " + dataType);
                    }
                    DataTypeKeyDataResultDTO dataTypeKeyData = dataTypeKeyDataUtil.getDataTypeKeyData(dataType, true);
                    var keyData = dataTypeKeyData.getEktKeyNm();
                    LOGGER.debug("------the key data Name is---------" + keyData);
                    Key key = NAEKey.getSecretKey(keyData, naeSession);
                    LOGGER.debug("------the key is---------" + key);
                    keyMap.put(keyData, key);
                    dataTypeDigestMap.put(dataType, dataTypeKeyData.getHatHashAlgrNm());
                }
            }

            // End ibatis way
        } catch (Exception e) {
            LOGGER.error("Key initialization failure", e);
        }
    }


    public Map<String , String> getDataTypeDigestMap(){
        return dataTypeDigestMap;
    }

    public  Key getKey(String keyName){
        return getKeyForName(keyName);
    }

    private  Key getKeyForName(String keyName) {
        Key key = (Key) keyMap.get(keyName);
        if (key == null) {
            key = NAEKey.getSecretKey(keyName, naeSession);
            keyMap.put(keyName, key);
        }
        return key;
    }

}
