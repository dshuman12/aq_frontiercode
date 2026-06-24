import { getValueFromParamByParamName, getValueFromStoreByParamName } from "@libs/utils";
import {
  REGION,
  ENV,
  AWS_ACCOUNT_ID,
  AUTH_FLOW_SCOPES_PARAM,
  SCOPE_TO_RESOURCE_MAP_URL_PARAM,
  APR_GATEWAY_ID,
  CUSTOMER_CARE_GATEWAY_ID,
  API_BROKER_GATEWAY_ID,
  AUTHENTICATION_GATEWAY_ID,
  CARD_SERVICE_OIDC_GATEWAY_ID,
  ACCOUNT_SERVICE_OIDC_GATEWAY_ID,
  CUSTOMER_SERVICE_OIDC_GATEWAY_ID,
  REPAYMENT_SERVICE_GATEWAY_ID,
  ALERT_SERVICE_OIDC_GATEWAY_ID,
  TRANSACTION_SERVICE_OIDC_GATEWAY_ID,
  DEVICE_CHANNEL_GATEWAY_ID,
  BIOMETRICS_SERVICE_GATEWAY_ID,
} from "@libs/config";

type MapArray = Record<string, string[]>;

const arn_prefix = `arn:aws:execute-api:${REGION}:${AWS_ACCOUNT_ID}`;

const replaceResourcePlaceholders = (resource: string) => {
  return resource
    .replace("{arn_prefix}", arn_prefix)
    .replace("{apr_gateway_id}", APR_GATEWAY_ID)
    .replace("{customer_care_gateway_id}", CUSTOMER_CARE_GATEWAY_ID)
    .replace("{api_broker_gateway_id}", API_BROKER_GATEWAY_ID)
    .replace("{authentication_gateway_id}", AUTHENTICATION_GATEWAY_ID)
    .replace("{card_service_oidc_gateway_id}", CARD_SERVICE_OIDC_GATEWAY_ID)
    .replace("{account_service_oidc_gateway_id}", ACCOUNT_SERVICE_OIDC_GATEWAY_ID)
    .replace("{customer_service_oidc_gateway_id}", CUSTOMER_SERVICE_OIDC_GATEWAY_ID)
    .replace("{repayment_service_gateway_id}", REPAYMENT_SERVICE_GATEWAY_ID)
    .replace("{alert_service_oidc_gateway_id}", ALERT_SERVICE_OIDC_GATEWAY_ID)
    .replace("{transaction_service_oidc_gateway_id}", TRANSACTION_SERVICE_OIDC_GATEWAY_ID)
    .replace("{device_channel_gateway_id}", DEVICE_CHANNEL_GATEWAY_ID)
    .replace("{biometrics_service_gateway_id}", BIOMETRICS_SERVICE_GATEWAY_ID)
    .replace("{env}", ENV);
};

export const getScopeToResourceMap = async () => {
  const scopeToResourceMapValueFromStorage = await getValueFromStoreByParamName(
    SCOPE_TO_RESOURCE_MAP_URL_PARAM,
  );

  if (!scopeToResourceMapValueFromStorage) {
    throw new Error(`Failed to fetch parameters from SSM - scope_to_resource_map_url_param`);
  }

  let scopeToResourceMap = JSON.parse(scopeToResourceMapValueFromStorage) as MapArray;

  const SCOPE_TO_RESOURCE_MAP: MapArray = {};

  for (const [scope, resources] of Object.entries(scopeToResourceMap)) {
    SCOPE_TO_RESOURCE_MAP[scope] = (resources as string[]).map(replaceResourcePlaceholders);
  }

  return { SCOPE_TO_RESOURCE_MAP };
};

export const getSpecificScopeToResourceMaps = async () => {
  const [authFlowScopesValue, scopeToResourceMapValueFromStorage] = await Promise.all([
    getValueFromParamByParamName(AUTH_FLOW_SCOPES_PARAM),
    getValueFromStoreByParamName(SCOPE_TO_RESOURCE_MAP_URL_PARAM),
  ]);

  if (!authFlowScopesValue || !scopeToResourceMapValueFromStorage) {
    throw new Error(`Failed to fetch parameters from SSM`);
  }

  const authFlowScopes = JSON.parse(authFlowScopesValue) as MapArray;

  const scopeToResourceMap = JSON.parse(scopeToResourceMapValueFromStorage) as MapArray;

  if (
    !authFlowScopes.otp_scopes ||
    !authFlowScopes.otp_passcode_scopes ||
    !authFlowScopes.extra_scopes
  ) {
    throw new Error("Missing required scopes in auth_flow_scopes_param");
  }

  const filterScopes = (scopes: string[]) => {
    return scopes.reduce((acc, scope) => {
      if (scopeToResourceMap[scope]) {
        acc[scope] = scopeToResourceMap[scope].map(replaceResourcePlaceholders);
      }
      return acc;
    }, {} as MapArray);
  };

  const specificScopeToResourceMap = {
    OTP_AUTH_SCOPE_TO_RESOURCE_MAP: filterScopes(authFlowScopes.otp_scopes),
    OTP_PASSCODE_AUTH_SCOPE_TO_RESOURCE_MAP: filterScopes(authFlowScopes.otp_passcode_scopes),
    EXTRA_SCOPE_TO_RESOURCE_MAP: filterScopes(authFlowScopes.extra_scopes),
  };

  return specificScopeToResourceMap;
};
