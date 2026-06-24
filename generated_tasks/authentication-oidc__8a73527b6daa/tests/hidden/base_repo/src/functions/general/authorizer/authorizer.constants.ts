import { logger } from "@libs/logger";
import { getValueFromParamByParamName, getValueFromStoreByParamName } from "@libs/utils";

type MapArray = Record<string, string[]>;

const region = process.env.REGION as string;
const env = process.env.ENVIRONMENT as string;
const aws_account_id = process.env.AWS_ACCOUNT_ID as string;

const auth_flow_scopes_param = process.env.AUTH_FLOW_SCOPES_PARAM as string;
const scope_to_resource_map_param = process.env.SCOPE_TO_RESOURCE_MAP_PARAM as string;
const scope_to_resource_map_url_param = process.env.SCOPE_TO_RESOURCE_MAP_URL_PARAM as string;

const apr_gateway_id = process.env.APR_GATEWAY_ID as string;
const customer_care_gateway_id = process.env.CUSTOMER_CARE_GATEWAY_ID as string;
const api_broker_gateway_id = process.env.API_BROKER_GATEWAY_ID as string;
const authentication_gateway_id = process.env.AUTHENTICATION_GATEWAY_ID as string;
const card_service_oidc_gateway_id = process.env.CARD_SERVICE_OIDC_GATEWAY_ID as string;
const account_service_oidc_gateway_id = process.env.ACCOUNT_SERVICE_OIDC_GATEWAY_ID as string;
const customer_service_oidc_gateway_id = process.env.CUSTOMER_SERVICE_OIDC_GATEWAY_ID as string;
const repayment_service_gateway_id = process.env.REPAYMENT_SERVICE_GATEWAY_ID as string;
const alert_service_oidc_gateway_id = process.env.ALERT_SERVICE_OIDC_GATEWAY_ID as string;
const transaction_service_oidc_gateway_id = process.env
  .TRANSACTION_SERVICE_OIDC_GATEWAY_ID as string;
const device_channel_gateway_id = process.env.DEVICE_CHANNEL_GATEWAY_ID as string;

const arn_prefix = `arn:aws:execute-api:${region}:${aws_account_id}`;

const replaceResourcePlaceholders = (resource: string) => {
  return resource
    .replace("{arn_prefix}", arn_prefix)
    .replace("{apr_gateway_id}", apr_gateway_id)
    .replace("{customer_care_gateway_id}", customer_care_gateway_id)
    .replace("{api_broker_gateway_id}", api_broker_gateway_id)
    .replace("{authentication_gateway_id}", authentication_gateway_id)
    .replace("{card_service_oidc_gateway_id}", card_service_oidc_gateway_id)
    .replace("{account_service_oidc_gateway_id}", account_service_oidc_gateway_id)
    .replace("{customer_service_oidc_gateway_id}", customer_service_oidc_gateway_id)
    .replace("{repayment_service_gateway_id}", repayment_service_gateway_id)
    .replace("{alert_service_oidc_gateway_id}", alert_service_oidc_gateway_id)
    .replace("{transaction_service_oidc_gateway_id}", transaction_service_oidc_gateway_id)
    .replace("{device_channel_gateway_id}", device_channel_gateway_id)
    .replace("{env}", env);
};

export const getScopeToResourceMap = async () => {
  logger.info(`Fetching scope to resource map from SSM`);

  const scopeToResourceMapValueFromStorage = await getValueFromStoreByParamName(
    scope_to_resource_map_url_param,
  );

  logger.info(`Fetched scope to resource map from SSM`);

  if (!scopeToResourceMapValueFromStorage) {
    throw new Error(`Failed to fetch parameters from SSM - scope_to_resource_map_url_param`);
  }

  let scopeToResourceMap = JSON.parse(scopeToResourceMapValueFromStorage) as MapArray;

  const SCOPE_TO_RESOURCE_MAP: MapArray = {};

  for (const [scope, resources] of Object.entries(scopeToResourceMap)) {
    SCOPE_TO_RESOURCE_MAP[scope] = (resources as string[]).map(replaceResourcePlaceholders);
  }

  logger.info(`Successfully fetched scope to resource map from scope_to_resource_map_url_param`);

  logger.info(`Scope to resource map value ${JSON.stringify(SCOPE_TO_RESOURCE_MAP, null, 2)}`);

  return { SCOPE_TO_RESOURCE_MAP };
};

export const getSpecificScopeToResourceMaps = async () => {
  const [authFlowScopesValue, scopeToResourceMapValueFromStorage] = await Promise.all([
    getValueFromParamByParamName(auth_flow_scopes_param),
    getValueFromStoreByParamName(scope_to_resource_map_url_param),
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

  logger.info(
    `Successfully fetched specific scope to resource maps ${JSON.stringify(
      specificScopeToResourceMap,
      null,
      2,
    )}`,
  );
  return specificScopeToResourceMap;
};
