locals {
  secret_prefix  = "arn:aws:secretsmanager:${local.common_config.service.REGION}:${var.AWS_ACCOUNT_ID}:secret"
  dynamo_prefix  = "arn:aws:dynamodb:${local.common_config.service.REGION}:${var.AWS_ACCOUNT_ID}:table"
  mobile_prefix  = "arn:aws:mobiletargeting:${local.common_config.service.REGION}:${var.AWS_ACCOUNT_ID}"
  gateway_prefix = "arn:aws:execute-api:${local.common_config.service.REGION}:${var.AWS_ACCOUNT_ID}"
  param_prefix   = "arn:aws:ssm:${local.common_config.service.REGION}:${var.AWS_ACCOUNT_ID}:parameter"

  api_version = "v7"

  # ── DynamoDB table ARNs ──────────────────────────────────────────────────
  arn_user_table                  = "${local.dynamo_prefix}/${local.USER_TABLE}"
  arn_user_table_indexes          = "${local.dynamo_prefix}/${local.USER_TABLE}/index/*"
  arn_auth_transactions_table     = "${local.dynamo_prefix}/${local.AUTH_TRANSACTIONS_TABLE}"
  arn_auth_transactions_indexes   = "${local.dynamo_prefix}/${local.AUTH_TRANSACTIONS_TABLE}/index/*"
  arn_auth_codes_table            = "${local.dynamo_prefix}/${local.AUTH_CODES_TABLE}"
  arn_auth_tokens_table           = "${local.dynamo_prefix}/${local.AUTH_TOKENS_TABLE}"
  arn_auth_tokens_indexes         = "${local.dynamo_prefix}/${local.AUTH_TOKENS_TABLE}/index/*"
  arn_auth_refresh_tokens_table   = "${local.dynamo_prefix}/${local.AUTH_REFRESH_TOKENS_TABLE}"
  arn_auth_refresh_tokens_indexes = "${local.dynamo_prefix}/${local.AUTH_REFRESH_TOKENS_TABLE}/index/*"
  arn_auth_hashes_table           = "${local.dynamo_prefix}/${local.AUTH_HASHES_TABLE}"
  arn_auth_hashes_indexes         = "${local.dynamo_prefix}/${local.AUTH_HASHES_TABLE}/index/*"
  arn_auth_keys_table             = "${local.dynamo_prefix}/${local.AUTH_KEYS_TABLE}"
  arn_auth_keys_indexes           = "${local.dynamo_prefix}/${local.AUTH_KEYS_TABLE}/index/*"
  arn_legacy_auth_table           = "${local.dynamo_prefix}/${local.LEGACY_AUTH_TABLE}"
  arn_legacy_rsa_table            = "${local.dynamo_prefix}/${local.LEGACY_RSA_TABLE}"
  arn_legacy_auth_backup_table    = "${local.dynamo_prefix}/${local.LEGACY_AUTH_BACKUP_TABLE}"
  arn_legacy_rsa_backup_table     = "${local.dynamo_prefix}/${local.LEGACY_RSA_BACKUP_TABLE}"
  arn_apr_increases_table         = "${local.dynamo_prefix}/${local.APR_INCREASES_TABLE}"
  arn_rate_limiting_table         = "${local.dynamo_prefix}/${local.RATE_LIMITING_TABLE}"
  arn_rate_limiting_indexes       = "${local.dynamo_prefix}/${local.RATE_LIMITING_TABLE}/index/*"

  # ── Secret ARNs ──────────────────────────────────────────────────────────
  secret_auth_signing_keys = "${local.secret_prefix}:onmo-auth-signing-keys-${var.ENVIRONMENT}*"
  secret_mambu             = "${local.secret_prefix}:onmo-mambu-${var.ENVIRONMENT}*"
  secret_mambu_wildcard    = "${local.secret_prefix}:onmo-mambu-*"
  secret_mambu_legacy      = "${local.secret_prefix}:mambu_${var.ENVIRONMENT}*"
  secret_directdebit       = "${local.secret_prefix}:onmo-directdebit-${var.ENVIRONMENT}*"
  secret_service_layer     = "${local.secret_prefix}:onmo-service-layer-${var.ENVIRONMENT}*"
  secret_posthog           = "${local.secret_prefix}:onmo-posthog-${var.ENVIRONMENT}*"
  secret_sfmc              = "${local.secret_prefix}:salesforce-marketing-cloud-${var.ENVIRONMENT}*"
  secret_sfdc_connection   = "${local.secret_prefix}:events!connection/onmo-sales-force-api-connection-${var.ENVIRONMENT}*"
  secret_sendgrid          = "${local.secret_prefix}:sendgrid_prod*"
  secret_onmo              = "${local.secret_prefix}:onmo*"
  secret_crm               = "${local.secret_prefix}:crm_${var.ENVIRONMENT}*"

  # ── Pinpoint ARNs ────────────────────────────────────────────────────────
  pinpoint_messages_arn       = "${local.mobile_prefix}:apps/${var.PINPOINT_PROJECT_ID}/messages"
  pinpoint_endpoints_arn      = "${local.mobile_prefix}:apps/${var.PINPOINT_PROJECT_ID}/endpoints/*"
  pinpoint_phone_validate_arn = "${local.mobile_prefix}:phone/number/validate"

  # ── SSM parameter ARNs ───────────────────────────────────────────────────
  arn_rate_limiting_param     = "${local.param_prefix}${local.env_config.params.RATE_LIMITING_PARAM}"
  arn_app_tester_login_config = "${local.param_prefix}${local.APP_TESTER_LOGIN_CONFIG}"
  arn_token_lifetimes_param   = "${local.param_prefix}${local.TOKEN_LIFETIMES_PARAM}"

  # ── Gateway ARNs ─────────────────────────────────────────────────────────
  gateway_arn_customer_care    = "${local.gateway_prefix}:${local.env_config.gateways.CUSTOMER_CARE_GATEWAY_ID}"
  gateway_arn_api_broker       = "${local.gateway_prefix}:${local.common_config.gateways.API_BROKER_GATEWAY_ID}"
  gateway_arn_card_service     = "${local.gateway_prefix}:${local.env_config.gateways.CARD_SERVICE_OIDC_GATEWAY_ID}"
  gateway_arn_account_service  = "${local.gateway_prefix}:${local.env_config.gateways.ACCOUNT_SERVICE_OIDC_GATEWAY_ID}"
  gateway_arn_customer_service = "${local.gateway_prefix}:${local.env_config.gateways.CUSTOMER_SERVICE_OIDC_GATEWAY_ID}"
  gateway_arn_repayment        = "${local.gateway_prefix}:${local.env_config.gateways.REPAYMENT_SERVICE_GATEWAY_ID}"
  gateway_arn_alert_service    = "${local.gateway_prefix}:${local.env_config.gateways.ALERT_SERVICE_OIDC_GATEWAY_ID}"
  gateway_arn_transaction      = "${local.gateway_prefix}:${local.env_config.gateways.TRANSACTION_SERVICE_OIDC_GATEWAY_ID}"
  gateway_arn_device_channel   = "${local.gateway_prefix}:${local.env_config.gateways.DEVICE_CHANNEL_GATEWAY_ID}"
  gateway_arn_biometrics       = "${local.gateway_prefix}:${local.env_config.gateways.BIOMETRICS_SERVICE_GATEWAY_ID}"
  gateway_arn_apr              = "${local.gateway_prefix}:${local.env_config.gateways.APR_GATEWAY_ID}"
}


# -- general

module "authorizer" {
  source         = "app.terraform.io/onmo/module-lambda-function/aws"
  version        = "1.0.0"
  service_config = local.service_config
  lambda_config  = merge(local.shared_lambda_config, local.general_lambda_config)
  vpc_config     = local.paymentology_vpc_config

  environment_variables = merge(
    local.shared_environment,
    local.env_gateways,
    local.env_params,
    local.env_tables,
    {
      GATEWAY_IDS               = jsonencode(local.gateway_ids)
      ROUTE_SCOPE_LOOKUP_SHADOW = "true"
    }
  )

  lambda_function_name = "authorizer"

  execution_from = [
    { service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn },
    { service = "APIGateway", source_arn = local.gateway_arn_customer_care },
    { service = "APIGateway", source_arn = local.gateway_arn_api_broker },
    { service = "APIGateway", source_arn = local.gateway_arn_card_service },
    { service = "APIGateway", source_arn = local.gateway_arn_account_service },
    { service = "APIGateway", source_arn = local.gateway_arn_customer_service },
    { service = "APIGateway", source_arn = local.gateway_arn_repayment },
    { service = "APIGateway", source_arn = local.gateway_arn_alert_service },
    { service = "APIGateway", source_arn = local.gateway_arn_transaction },
    { service = "APIGateway", source_arn = local.gateway_arn_device_channel },
    { service = "APIGateway", source_arn = local.gateway_arn_biometrics },
  ]
  permission_statements = [
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:Query"],
      Resource = [local.arn_auth_tokens_table]
    },
    {
      Effect   = "Allow",
      Actions  = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"],
      Resource = [local.secret_auth_signing_keys]
    },
    {
      Effect  = "Allow",
      Actions = ["ssm:GetParameter"],
      Resource = [
        aws_ssm_parameter.auth_flow_scopes.arn,
        aws_ssm_parameter.scope_to_resource_map.arn,
        aws_ssm_parameter.scope_to_resource_url_map.arn,
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["s3:GetObject"],
      Resource = ["${aws_s3_bucket.scope_to_resource_map_bucket.arn}/*"]
    },
  ]
  memory_size = 2048
  timeout     = 30
}

module "token" {
  source         = "app.terraform.io/onmo/module-lambda-function/aws"
  version        = "1.0.0"
  service_config = local.service_config
  lambda_config  = merge(local.shared_lambda_config, local.general_lambda_config)

  environment_variables = merge(
    local.shared_environment,
    local.env_gateways,
    local.env_tables,
    local.env_params
  )

  lambda_function_name = "token"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect   = "Allow",
      Actions  = ["secretsmanager:GetSecretValue"],
      Resource = [local.secret_auth_signing_keys]
    },
    {
      Effect  = "Allow",
      Actions = ["dynamodb:Query"],
      Resource = [
        local.arn_user_table,
        local.arn_user_table_indexes,
        local.arn_auth_transactions_table,
        local.arn_auth_codes_table,
        local.arn_auth_tokens_table,
        local.arn_auth_tokens_indexes,
        local.arn_auth_refresh_tokens_table,
        local.arn_auth_refresh_tokens_indexes,
        local.arn_rate_limiting_table,
        local.arn_rate_limiting_indexes
      ]
    },
    {
      Effect  = "Allow",
      Actions = ["dynamodb:DeleteItem"],
      Resource = [
        local.arn_auth_transactions_table,
        local.arn_auth_tokens_table,
        local.arn_auth_refresh_tokens_table,
        local.arn_auth_codes_table
      ]
    },
    {
      Effect  = "Allow",
      Actions = ["dynamodb:PutItem"],
      Resource = [
        local.arn_auth_tokens_table,
        local.arn_auth_refresh_tokens_table,
        local.arn_rate_limiting_table
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:UpdateItem"],
      Resource = [local.arn_user_table]
    },
    {
      Effect  = "Allow",
      Actions = ["ssm:GetParameter"],
      Resource = [
        aws_ssm_parameter.exclusive_scopes.arn,
        local.arn_rate_limiting_param,
        local.arn_token_lifetimes_param
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["s3:GetObject"],
      Resource = ["${aws_s3_bucket.scope_to_resource_map_bucket.arn}/*"]
    },
  ]
  memory_size = 2048
  timeout     = 30
}

module "logout" {
  source         = "app.terraform.io/onmo/module-lambda-function/aws"
  version        = "1.0.0"
  service_config = local.service_config
  lambda_config  = merge(local.shared_lambda_config, local.general_lambda_config)

  environment_variables = merge(local.shared_environment, local.env_params, local.env_tables)

  lambda_function_name = "logout"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect  = "Allow",
      Actions = ["dynamodb:Query"],
      Resource = [
        local.arn_auth_tokens_table,
        local.arn_auth_tokens_indexes,
        local.arn_auth_refresh_tokens_table,
        local.arn_auth_refresh_tokens_indexes,
        local.arn_rate_limiting_table,
        local.arn_rate_limiting_indexes
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:PutItem"],
      Resource = [local.arn_rate_limiting_table]
    },
    {
      Effect  = "Allow",
      Actions = ["dynamodb:DeleteItem"],
      Resource = [
        local.arn_auth_tokens_table,
        local.arn_auth_refresh_tokens_table,
      ]
    },
    {
      Effect  = "Allow",
      Actions = ["ssm:GetParameter"],
      Resource = [
        local.arn_rate_limiting_param,
        aws_ssm_parameter.exclusive_scopes.arn,
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["s3:GetObject"],
      Resource = ["${aws_s3_bucket.scope_to_resource_map_bucket.arn}/*"]
    },
  ]
  memory_size = 2048
  timeout     = 30
}

module "eligibility" {
  source         = "app.terraform.io/onmo/module-lambda-function/aws"
  version        = "1.0.0"
  service_config = local.service_config
  lambda_config  = merge(local.shared_lambda_config, local.general_lambda_config)
  vpc_config     = local.paymentology_vpc_config

  environment_variables = merge(
    local.shared_environment,
    local.env_card,
    local.env_misc,
    local.env_params,
    local.env_tables
  )

  lambda_function_name = "eligibility"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect  = "Allow",
      Actions = ["dynamodb:Query"],
      Resource = [
        local.arn_user_table,
        local.arn_user_table_indexes,
        local.arn_rate_limiting_table,
        local.arn_rate_limiting_indexes,
      ]
    },
    {
      Effect  = "Allow"
      Actions = ["dynamodb:GetItem"],
      Resource = [
        local.arn_user_table,
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:PutItem"],
      Resource = [local.arn_rate_limiting_table]
    },
    {
      Effect  = "Allow",
      Actions = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"],
      Resource = [
        local.secret_mambu,
        local.secret_directdebit,
        local.secret_posthog,
        local.secret_service_layer
      ]
    },
    {
      Effect  = "Allow",
      Actions = ["ssm:GetParameter"],
      Resource = [
        local.arn_rate_limiting_param,
        aws_ssm_parameter.auth_flow_scopes.arn,
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["s3:GetObject"],
      Resource = ["${aws_s3_bucket.scope_to_resource_map_bucket.arn}/*"]
    }
  ]
  memory_size = 2048
  timeout     = 30
}



# -- otp

module "authorize" {
  source         = "app.terraform.io/onmo/module-lambda-function/aws"
  version        = "1.0.0"
  service_config = local.service_config
  lambda_config  = merge(local.shared_lambda_config, local.otp_lambda_config)

  environment_variables = merge(local.shared_environment, local.env_params, local.env_tables)

  lambda_function_name = "authorize"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect  = "Allow",
      Actions = ["dynamodb:Query"],
      Resource = [
        local.arn_user_table,
        local.arn_apr_increases_table
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:PutItem"],
      Resource = [local.arn_auth_transactions_table]
    },
    {
      Effect  = "Allow"
      Actions = ["dynamodb:GetItem"],
      Resource = [
        local.arn_user_table,
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["secretsmanager:GetSecretValue"],
      Resource = [local.secret_crm]
    },
    {
      Effect  = "Allow",
      Actions = ["secretsmanager:GetSecretValue"],
      Resource = [
        local.secret_mambu_legacy,
        local.secret_mambu,
        local.secret_posthog
      ]
    },
    {
      Effect  = "Allow",
      Actions = ["ssm:GetParameter"],
      Resource = [
        aws_ssm_parameter.auth_flow_scopes.arn,
        aws_ssm_parameter.scope_to_resource_map.arn,
        aws_ssm_parameter.scope_to_resource_url_map.arn,
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["s3:GetObject"],
      Resource = ["${aws_s3_bucket.scope_to_resource_map_bucket.arn}/*"]
    },
  ]
  memory_size = 2048
  timeout     = 30
}

module "sendOTP" {
  source         = "app.terraform.io/onmo/module-lambda-function/aws"
  version        = "1.0.0"
  service_config = local.service_config
  lambda_config  = merge(local.shared_lambda_config, local.otp_lambda_config)

  environment_variables = merge(
    local.shared_environment,
    local.env_sfmc,
    local.env_card,
    local.env_tables
  )

  lambda_function_name = "sendOTP"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect  = "Allow",
      Actions = ["dynamodb:Query"],
      Resource = [
        local.arn_auth_transactions_table,
        local.arn_user_table,
        local.arn_user_table_indexes
      ]
    },
    {
      Effect   = "Allow"
      Actions  = ["dynamodb:GetItem"],
      Resource = [local.arn_user_table]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:UpdateItem"],
      Resource = [local.arn_auth_transactions_table]
    },
    {
      Effect  = "Allow",
      Actions = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"],
      Resource = [
        local.secret_mambu,
        local.secret_directdebit,
        local.secret_service_layer
      ]
    },
    {
      Effect  = "Allow",
      Actions = ["mobiletargeting:SendMessages"],
      Resource = [local.pinpoint_messages_arn,
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["mobiletargeting:UpdateEndpoint"]
      Resource = [local.pinpoint_endpoints_arn]
    },
    {
      Effect   = "Allow",
      Actions  = ["mobiletargeting:PhoneNumberValidate"],
      Resource = [local.pinpoint_phone_validate_arn]
    },
    {
      Effect   = "Allow",
      Actions  = ["s3:GetObject"],
      Resource = ["${aws_s3_bucket.scope_to_resource_map_bucket.arn}/*"]
    },
    {
      Effect  = "Allow"
      Actions = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"]
      Resource = [
        local.secret_sfmc,
        local.secret_sfdc_connection,
        local.secret_posthog,
      ]
    }
  ]
  memory_size = 2048
  timeout     = 30
}

module "verifyOTP" {
  source         = "app.terraform.io/onmo/module-lambda-function/aws"
  version        = "1.0.0"
  service_config = local.service_config
  lambda_config  = merge(local.shared_lambda_config, local.otp_lambda_config)

  environment_variables = merge(local.shared_environment, local.env_tables)

  lambda_function_name = "verifyOTP"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:UpdateItem"],
      Resource = [local.arn_auth_transactions_table]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:Query"],
      Resource = [local.arn_auth_transactions_table]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:PutItem"],
      Resource = [local.arn_auth_codes_table]
    },
    {
      Effect   = "Allow",
      Actions  = ["s3:GetObject"],
      Resource = ["${aws_s3_bucket.scope_to_resource_map_bucket.arn}/*"]
    },
  ]
  memory_size = 2048
  timeout     = 30
}



# -- otp-passcode

module "otp-passcode-authorize" {
  source         = "app.terraform.io/onmo/module-lambda-function/aws"
  version        = "1.0.0"
  service_config = local.service_config
  lambda_config  = merge(local.shared_lambda_config, local.otp_passcode_lambda_config)

  environment_variables = merge(
    local.shared_environment,
    local.env_params,
    local.env_card,
    local.env_tables
  )

  lambda_function_name = "otp-passcode-authorize"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect  = "Allow",
      Actions = ["dynamodb:Query"],
      Resource = [
        local.arn_user_table,
        local.arn_user_table_indexes,
        local.arn_auth_transactions_table,
        local.arn_auth_transactions_indexes,
        local.arn_auth_hashes_table,
        local.arn_auth_hashes_indexes,
      ]
    },
    {
      Effect  = "Allow",
      Actions = ["dynamodb:GetItem"],
      Resource = [
        local.arn_user_table,
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:PutItem"],
      Resource = [local.arn_auth_transactions_table]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:DeleteItem"],
      Resource = [local.arn_auth_transactions_table]
    },
    {
      Effect  = "Allow",
      Actions = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"],
      Resource = [
        local.secret_mambu,
        local.secret_directdebit,
        local.secret_posthog,
        local.secret_service_layer
      ]
    },
    {
      Effect  = "Allow",
      Actions = ["ssm:GetParameter"],
      Resource = [
        aws_ssm_parameter.non_conflicting_scope_groups.arn,
        aws_ssm_parameter.exclusive_scopes.arn,
        aws_ssm_parameter.auth_flow_scopes.arn,
        aws_ssm_parameter.scope_to_resource_map.arn,
        aws_ssm_parameter.scope_to_resource_url_map.arn,
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["s3:GetObject"],
      Resource = ["${aws_s3_bucket.scope_to_resource_map_bucket.arn}/*"]
    },
  ]
  memory_size = 2048
  timeout     = 30
}

module "otp-passcode-sendOTP" {
  source         = "app.terraform.io/onmo/module-lambda-function/aws"
  version        = "1.0.0"
  service_config = local.service_config
  lambda_config  = merge(local.shared_lambda_config, local.otp_passcode_lambda_config)

  environment_variables = merge(
    local.shared_environment,
    local.env_sfmc,
    local.env_card,
    local.env_tables,
    local.env_params
  )

  lambda_function_name = "otp-passcode-sendOTP"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect  = "Allow",
      Actions = ["dynamodb:Query"],
      Resource = [
        local.arn_auth_transactions_table,
        local.arn_auth_transactions_indexes,
        local.arn_auth_hashes_table,
        local.arn_auth_hashes_indexes,
        local.arn_user_table,
        local.arn_user_table_indexes,
        local.arn_rate_limiting_table,
        local.arn_rate_limiting_indexes,
      ]
    },
    {
      Effect  = "Allow"
      Actions = ["dynamodb:GetItem"],
      Resource = [
        local.arn_user_table,
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:UpdateItem"],
      Resource = [local.arn_auth_transactions_table]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:DeleteItem"],
      Resource = [local.arn_auth_transactions_table]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:PutItem"],
      Resource = [local.arn_rate_limiting_table]
    },
    {
      Effect  = "Allow",
      Actions = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"],
      Resource = [
        local.secret_mambu,
        local.secret_directdebit,
        local.secret_service_layer
      ]
    },
    {
      Effect  = "Allow",
      Actions = ["mobiletargeting:SendMessages"],
      Resource = [local.pinpoint_messages_arn,
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["mobiletargeting:UpdateEndpoint"]
      Resource = [local.pinpoint_endpoints_arn]
    },
    {
      Effect   = "Allow",
      Actions  = ["mobiletargeting:PhoneNumberValidate"],
      Resource = [local.pinpoint_phone_validate_arn]
    },
    {
      Effect  = "Allow",
      Actions = ["ssm:GetParameter"],
      Resource = [
        local.arn_rate_limiting_param,
        aws_ssm_parameter.exclusive_scopes.arn,
        local.arn_app_tester_login_config
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["s3:GetObject"],
      Resource = ["${aws_s3_bucket.scope_to_resource_map_bucket.arn}/*"]
    },
    {
      Effect  = "Allow"
      Actions = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"]
      Resource = [
        local.secret_sfmc,
        local.secret_sfdc_connection,
        local.secret_posthog,
      ]
    }
  ]
  memory_size = 2048
  timeout     = 30
}

module "otp-passcode-resendOTP" {
  source         = "app.terraform.io/onmo/module-lambda-function/aws"
  version        = "1.0.0"
  service_config = local.service_config
  lambda_config  = merge(local.shared_lambda_config, local.otp_passcode_lambda_config)

  environment_variables = merge(
    local.shared_environment,
    local.env_sfmc,
    local.env_params,
    local.env_tables
  )

  lambda_function_name = "otp-passcode-resendOTP"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect  = "Allow",
      Actions = ["dynamodb:Query"],
      Resource = [
        local.arn_auth_transactions_table,
        local.arn_rate_limiting_table,
        local.arn_rate_limiting_indexes
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:UpdateItem"],
      Resource = [local.arn_auth_transactions_table]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:DeleteItem"],
      Resource = [local.arn_auth_transactions_table]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:PutItem"],
      Resource = [local.arn_rate_limiting_table]
    },
    {
      Effect  = "Allow",
      Actions = ["mobiletargeting:SendMessages"],
      Resource = [local.pinpoint_messages_arn,
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["mobiletargeting:UpdateEndpoint"]
      Resource = [local.pinpoint_endpoints_arn]
    },
    {
      Effect   = "Allow",
      Actions  = ["mobiletargeting:PhoneNumberValidate"],
      Resource = [local.pinpoint_phone_validate_arn]
    },
    {
      Effect  = "Allow",
      Actions = ["ssm:GetParameter"],
      Resource = [
        local.arn_rate_limiting_param,
        local.arn_app_tester_login_config
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["s3:GetObject"],
      Resource = ["${aws_s3_bucket.scope_to_resource_map_bucket.arn}/*"]
    },
    {
      Effect  = "Allow"
      Actions = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"]
      Resource = [
        local.secret_sfmc,
        local.secret_sfdc_connection,
        local.secret_posthog,
      ]
    }
  ]
  memory_size = 2048
  timeout     = 30
}

module "otp-passcode-verifyOTP" {
  source         = "app.terraform.io/onmo/module-lambda-function/aws"
  version        = "1.0.0"
  service_config = local.service_config
  lambda_config  = merge(local.shared_lambda_config, local.otp_passcode_lambda_config)

  environment_variables = merge(local.shared_environment, local.env_tables)

  lambda_function_name = "otp-passcode-verifyOTP"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect  = "Allow",
      Actions = ["dynamodb:Query"],
      Resource = [
        local.arn_auth_transactions_table,
        local.arn_auth_hashes_table,
        local.arn_legacy_auth_table,
        local.arn_legacy_rsa_table,
        local.arn_rate_limiting_table,
        local.arn_rate_limiting_indexes
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:UpdateItem"],
      Resource = [local.arn_auth_transactions_table]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:DeleteItem"],
      Resource = [local.arn_auth_transactions_table]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:PutItem"],
      Resource = [local.arn_rate_limiting_table]
    },
    {
      Effect   = "Allow",
      Actions  = ["ssm:GetParameter"],
      Resource = [local.arn_rate_limiting_param]
    },
    {
      Effect   = "Allow",
      Actions  = ["s3:GetObject"],
      Resource = ["${aws_s3_bucket.scope_to_resource_map_bucket.arn}/*"]
    },
  ]
  memory_size = 2048
  timeout     = 30
}

module "otp-passcode-verifyPasscode" {
  source         = "app.terraform.io/onmo/module-lambda-function/aws"
  version        = "1.0.0"
  service_config = local.service_config
  lambda_config  = merge(local.shared_lambda_config, local.otp_passcode_lambda_config)

  environment_variables = merge(local.shared_environment, local.env_tables, local.env_params)

  lambda_function_name = "otp-passcode-verifyPasscode"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect  = "Allow",
      Actions = ["dynamodb:Query"],
      Resource = [
        local.arn_auth_transactions_table,
        local.arn_auth_hashes_table,
        local.arn_legacy_auth_table,
        local.arn_legacy_rsa_table,
        local.arn_rate_limiting_table,
        local.arn_rate_limiting_indexes
      ]
    },
    {
      Effect  = "Allow",
      Actions = ["dynamodb:GetItem"],
      Resource = [
        local.arn_legacy_auth_table,
        local.arn_legacy_rsa_table,
      ]
    },
    {
      Effect  = "Allow",
      Actions = ["dynamodb:UpdateItem"],
      Resource = [
        local.arn_auth_transactions_table,
        local.arn_user_table
      ]
    },
    {
      Effect  = "Allow",
      Actions = ["dynamodb:PutItem"],
      Resource = [
        local.arn_auth_codes_table,
        local.arn_auth_hashes_table,
        local.arn_rate_limiting_table,
        local.arn_legacy_auth_backup_table,
        local.arn_legacy_rsa_backup_table,
      ]
    },
    {
      Effect  = "Allow",
      Actions = ["dynamodb:DeleteItem"],
      Resource = [
        local.arn_auth_transactions_table,
        local.arn_legacy_auth_table,
        local.arn_legacy_rsa_table,
        local.arn_auth_hashes_table,
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"],
      Resource = [local.secret_onmo]
    },
    {
      Effect  = "Allow",
      Actions = ["ssm:GetParameter"],
      Resource = [
        local.arn_rate_limiting_param,
        local.arn_app_tester_login_config
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["s3:GetObject"],
      Resource = ["${aws_s3_bucket.scope_to_resource_map_bucket.arn}/*"]
    }
  ]
  memory_size = 2048
  timeout     = 30
}



# -- biometrics

module "biometrics-reg-initiate" {
  source         = "app.terraform.io/onmo/module-lambda-function/aws"
  version        = "1.0.0"
  service_config = local.service_config
  lambda_config  = merge(local.shared_lambda_config, local.biometrics_lambda_config)

  environment_variables = merge(
    local.shared_environment,
    local.env_card,
    local.env_tables,
    local.env_params
  )

  lambda_function_name = "biometrics-reg-initiate"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect  = "Allow",
      Actions = ["dynamodb:Query"],
      Resource = [
        local.arn_user_table,
        local.arn_auth_transactions_table,
        local.arn_auth_transactions_indexes,
        local.arn_rate_limiting_table,
        local.arn_rate_limiting_indexes
      ]
    },
    {
      Effect   = "Allow"
      Actions  = ["dynamodb:GetItem"],
      Resource = [local.arn_user_table]
    },
    {
      Effect  = "Allow",
      Actions = ["dynamodb:PutItem"],
      Resource = [
        local.arn_rate_limiting_table,
        local.arn_auth_transactions_table
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:DeleteItem"],
      Resource = [local.arn_auth_transactions_table]
    },
    {
      Effect  = "Allow",
      Actions = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"],
      Resource = [
        local.secret_mambu,
        local.secret_directdebit,
        local.secret_posthog,
        local.secret_service_layer
      ]
    },
    {
      Effect  = "Allow",
      Actions = ["ssm:GetParameter"],
      Resource = [
        local.arn_rate_limiting_param,
        aws_ssm_parameter.exclusive_scopes.arn,
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["s3:GetObject"],
      Resource = ["${aws_s3_bucket.scope_to_resource_map_bucket.arn}/*"]
    },
  ]
  memory_size = 2048
  timeout     = 30
}

module "biometrics-reg-complete" {
  source         = "app.terraform.io/onmo/module-lambda-function/aws"
  version        = "1.0.0"
  service_config = local.service_config
  lambda_config  = merge(local.shared_lambda_config, local.biometrics_lambda_config)

  environment_variables = merge(local.shared_environment, local.env_tables)

  lambda_function_name = "biometrics-reg-complete"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect  = "Allow",
      Actions = ["dynamodb:Query"],
      Resource = [
        local.arn_auth_transactions_table,
        local.arn_rate_limiting_table,
        local.arn_rate_limiting_indexes,
        local.arn_auth_keys_table,
        local.arn_auth_keys_indexes
      ]
    },
    {
      Effect  = "Allow",
      Actions = ["dynamodb:PutItem"],
      Resource = [
        local.arn_rate_limiting_table,
        local.arn_auth_keys_table
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:UpdateItem"],
      Resource = [local.arn_auth_keys_table]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:DeleteItem"],
      Resource = [local.arn_auth_transactions_table]
    },
    {
      Effect   = "Allow",
      Actions  = ["ssm:GetParameter"],
      Resource = [local.arn_rate_limiting_param]
    },
    {
      Effect   = "Allow",
      Actions  = ["s3:GetObject"],
      Resource = ["${aws_s3_bucket.scope_to_resource_map_bucket.arn}/*"]
    },
  ]
  memory_size = 2048
  timeout     = 30
}

module "biometrics-authorize" {
  source         = "app.terraform.io/onmo/module-lambda-function/aws"
  version        = "1.0.0"
  service_config = local.service_config
  lambda_config  = merge(local.shared_lambda_config, local.biometrics_lambda_config)

  environment_variables = merge(
    local.shared_environment,
    local.env_params,
    local.env_card,
    local.env_tables
  )

  lambda_function_name = "biometrics-authorize"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect  = "Allow",
      Actions = ["dynamodb:Query"],
      Resource = [
        local.arn_user_table,
        local.arn_user_table_indexes,
        local.arn_auth_transactions_table,
        local.arn_auth_transactions_indexes,
        local.arn_auth_keys_table,
      ]
    },
    {
      Effect  = "Allow",
      Actions = ["dynamodb:GetItem"],
      Resource = [
        local.arn_user_table,
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:PutItem"],
      Resource = [local.arn_auth_transactions_table]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:DeleteItem"],
      Resource = [local.arn_auth_transactions_table]
    },
    {
      Effect  = "Allow",
      Actions = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"],
      Resource = [
        local.secret_mambu,
        local.secret_directdebit,
        local.secret_posthog,
        local.secret_service_layer
      ]
    },
    {
      Effect  = "Allow",
      Actions = ["ssm:GetParameter"],
      Resource = [
        aws_ssm_parameter.non_conflicting_scope_groups.arn,
        aws_ssm_parameter.exclusive_scopes.arn,
        aws_ssm_parameter.auth_flow_scopes.arn,
        aws_ssm_parameter.scope_to_resource_map.arn,
        aws_ssm_parameter.scope_to_resource_url_map.arn,
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["s3:GetObject"],
      Resource = ["${aws_s3_bucket.scope_to_resource_map_bucket.arn}/*"]
    },
  ]
  memory_size = 2048
  timeout     = 30
}

module "biometrics-verify" {
  source         = "app.terraform.io/onmo/module-lambda-function/aws"
  version        = "1.0.0"
  service_config = local.service_config
  lambda_config  = merge(local.shared_lambda_config, local.biometrics_lambda_config)

  environment_variables = merge(local.shared_environment, local.env_tables)

  lambda_function_name = "biometrics-verify"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect  = "Allow",
      Actions = ["dynamodb:Query"],
      Resource = [
        local.arn_auth_transactions_table,
        local.arn_rate_limiting_table,
        local.arn_rate_limiting_indexes
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:UpdateItem"],
      Resource = [local.arn_auth_transactions_table]
    },
    {
      Effect  = "Allow",
      Actions = ["dynamodb:PutItem"],
      Resource = [
        local.arn_auth_codes_table,
        local.arn_rate_limiting_table
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:DeleteItem"],
      Resource = [local.arn_auth_transactions_table]
    },
    {
      Effect   = "Allow",
      Actions  = ["ssm:GetParameter"],
      Resource = [local.arn_rate_limiting_param]
    },
    {
      Effect   = "Allow",
      Actions  = ["s3:GetObject"],
      Resource = ["${aws_s3_bucket.scope_to_resource_map_bucket.arn}/*"]
    },
  ]
  memory_size = 2048
  timeout     = 30
}



# -- extra-scope

module "extra-scope-authorize" {
  source         = "app.terraform.io/onmo/module-lambda-function/aws"
  version        = "1.0.0"
  service_config = local.service_config
  lambda_config  = merge(local.shared_lambda_config, local.extra_scope_lambda_config)
  vpc_config     = local.paymentology_vpc_config

  environment_variables = merge(
    local.shared_environment,
    local.env_params,
    local.env_card,
    local.env_tables
  )

  lambda_function_name = "extra-scope-authorize"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect  = "Allow",
      Actions = ["dynamodb:Query"],
      Resource = [
        local.arn_user_table,
        local.arn_user_table_indexes,
        local.arn_auth_transactions_table,
        local.arn_auth_transactions_indexes,
        local.arn_auth_keys_table,
        local.arn_rate_limiting_table,
        local.arn_rate_limiting_indexes,
      ]
    },
    {
      Effect  = "Allow"
      Actions = ["dynamodb:GetItem"],
      Resource = [
        local.arn_user_table,
      ]
    },
    {
      Effect  = "Allow",
      Actions = ["dynamodb:PutItem"],
      Resource = [
        local.arn_rate_limiting_table,
        local.arn_auth_transactions_table,
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:DeleteItem"],
      Resource = [local.arn_auth_transactions_table]
    },
    {
      Effect  = "Allow",
      Actions = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"],
      Resource = [
        local.secret_mambu,
        local.secret_directdebit,
        local.secret_posthog,
        local.secret_service_layer
      ]
    },
    {
      Effect  = "Allow",
      Actions = ["ssm:GetParameter"],
      Resource = [
        local.arn_rate_limiting_param,
        aws_ssm_parameter.non_conflicting_scope_groups.arn,
        aws_ssm_parameter.exclusive_scopes.arn,
        aws_ssm_parameter.auth_flow_scopes.arn,
        aws_ssm_parameter.scope_to_resource_map.arn,
        aws_ssm_parameter.scope_to_resource_url_map.arn,
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["s3:GetObject"],
      Resource = ["${aws_s3_bucket.scope_to_resource_map_bucket.arn}/*"]
    },
  ]
  memory_size = 2048
  timeout     = 30
}

module "extra-scope-sendOTP" {
  source         = "app.terraform.io/onmo/module-lambda-function/aws"
  version        = "1.0.0"
  service_config = local.service_config
  lambda_config  = merge(local.shared_lambda_config, local.extra_scope_lambda_config)

  environment_variables = merge(
    local.shared_environment,
    local.env_sfmc,
    local.env_card,
    local.env_tables
  )

  lambda_function_name = "extra-scope-sendOTP"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect  = "Allow",
      Actions = ["dynamodb:Query"],
      Resource = [
        local.arn_user_table,
        local.arn_auth_transactions_table,
        local.arn_rate_limiting_table,
        local.arn_rate_limiting_indexes
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:GetItem"],
      Resource = [local.arn_user_table]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:PutItem"],
      Resource = [local.arn_rate_limiting_table]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:UpdateItem"],
      Resource = [local.arn_auth_transactions_table]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:DeleteItem"],
      Resource = [local.arn_auth_transactions_table]
    },
    {
      Effect  = "Allow",
      Actions = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"],
      Resource = [
        local.secret_mambu,
        local.secret_directdebit,
        local.secret_service_layer
      ]
    },
    {
      Effect  = "Allow",
      Actions = ["mobiletargeting:SendMessages"],
      Resource = [local.pinpoint_messages_arn,
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["mobiletargeting:UpdateEndpoint"]
      Resource = [local.pinpoint_endpoints_arn]
    },
    {
      Effect   = "Allow",
      Actions  = ["mobiletargeting:PhoneNumberValidate"],
      Resource = [local.pinpoint_phone_validate_arn]
    },
    {
      Effect   = "Allow",
      Actions  = ["ssm:GetParameter"],
      Resource = [local.arn_rate_limiting_param]
    },
    {
      Effect   = "Allow",
      Actions  = ["s3:GetObject"],
      Resource = ["${aws_s3_bucket.scope_to_resource_map_bucket.arn}/*"]
    },
    {
      Effect  = "Allow"
      Actions = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"]
      Resource = [
        local.secret_sfmc,
        local.secret_sfdc_connection,
        local.secret_posthog,
      ]
    }
  ]
  memory_size = 2048
  timeout     = 30
}

module "extra-scope-resendOTP" {
  source         = "app.terraform.io/onmo/module-lambda-function/aws"
  version        = "1.0.0"
  service_config = local.service_config
  lambda_config  = merge(local.shared_lambda_config, local.extra_scope_lambda_config)

  environment_variables = merge(local.shared_environment, local.env_sfmc, local.env_tables)

  lambda_function_name = "extra-scope-resendOTP"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect  = "Allow",
      Actions = ["dynamodb:Query"],
      Resource = [
        local.arn_auth_transactions_table,
        local.arn_rate_limiting_table,
        local.arn_rate_limiting_indexes
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:PutItem"],
      Resource = [local.arn_rate_limiting_table]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:UpdateItem"],
      Resource = [local.arn_auth_transactions_table]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:DeleteItem"],
      Resource = [local.arn_auth_transactions_table]
    },
    {
      Effect  = "Allow",
      Actions = ["mobiletargeting:SendMessages"],
      Resource = [local.pinpoint_messages_arn,
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["mobiletargeting:UpdateEndpoint"]
      Resource = [local.pinpoint_endpoints_arn]
    },
    {
      Effect   = "Allow",
      Actions  = ["mobiletargeting:PhoneNumberValidate"],
      Resource = [local.pinpoint_phone_validate_arn]
    },
    {
      Effect   = "Allow",
      Actions  = ["ssm:GetParameter"],
      Resource = [local.arn_rate_limiting_param]
    },
    {
      Effect   = "Allow",
      Actions  = ["s3:GetObject"],
      Resource = ["${aws_s3_bucket.scope_to_resource_map_bucket.arn}/*"]
    },
    {
      Effect  = "Allow"
      Actions = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"]
      Resource = [
        local.secret_sfmc,
        local.secret_sfdc_connection,
        local.secret_posthog,
      ]
    }
  ]
  memory_size = 2048
  timeout     = 30
}

module "extra-scope-verifyOTP" {
  source         = "app.terraform.io/onmo/module-lambda-function/aws"
  version        = "1.0.0"
  service_config = local.service_config
  lambda_config  = merge(local.shared_lambda_config, local.extra_scope_lambda_config)

  environment_variables = merge(local.shared_environment, local.env_tables)

  lambda_function_name = "extra-scope-verifyOTP"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect  = "Allow",
      Actions = ["dynamodb:Query"],
      Resource = [
        local.arn_auth_transactions_table,
        local.arn_rate_limiting_table,
        local.arn_rate_limiting_indexes
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:PutItem"],
      Resource = [local.arn_rate_limiting_table]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:UpdateItem"],
      Resource = [local.arn_auth_transactions_table]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:DeleteItem"],
      Resource = [local.arn_auth_transactions_table]
    },
    {
      Effect   = "Allow",
      Actions  = ["ssm:GetParameter"],
      Resource = [local.arn_rate_limiting_param]
    },
    {
      Effect   = "Allow",
      Actions  = ["s3:GetObject"],
      Resource = ["${aws_s3_bucket.scope_to_resource_map_bucket.arn}/*"]
    },
  ]
  memory_size = 2048
  timeout     = 30
}

module "extra-scope-verifyPasscode" {
  source         = "app.terraform.io/onmo/module-lambda-function/aws"
  version        = "1.0.0"
  service_config = local.service_config
  lambda_config  = merge(local.shared_lambda_config, local.extra_scope_lambda_config)

  environment_variables = merge(local.shared_environment, local.env_tables)

  lambda_function_name = "extra-scope-verifyPasscode"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect  = "Allow",
      Actions = ["dynamodb:Query"],
      Resource = [
        local.arn_auth_transactions_table,
        local.arn_auth_hashes_table,
        local.arn_legacy_auth_table,
        local.arn_legacy_rsa_table,
        local.arn_rate_limiting_table,
        local.arn_rate_limiting_indexes
      ]
    },
    {
      Effect  = "Allow",
      Actions = ["dynamodb:PutItem"],
      Resource = [
        local.arn_rate_limiting_table,
        local.arn_auth_codes_table
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:UpdateItem"],
      Resource = [local.arn_auth_transactions_table]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:DeleteItem"],
      Resource = [local.arn_auth_transactions_table]
    },
    {
      Effect   = "Allow",
      Actions  = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"],
      Resource = [local.secret_onmo]
    },
    {
      Effect   = "Allow",
      Actions  = ["ssm:GetParameter"],
      Resource = [local.arn_rate_limiting_param]
    },
    {
      Effect   = "Allow",
      Actions  = ["s3:GetObject"],
      Resource = ["${aws_s3_bucket.scope_to_resource_map_bucket.arn}/*"]
    },
  ]
  memory_size = 2048
  timeout     = 30
}

module "extra-scope-verifyBiometrics" {
  source         = "app.terraform.io/onmo/module-lambda-function/aws"
  version        = "1.0.0"
  service_config = local.service_config
  lambda_config  = merge(local.shared_lambda_config, local.extra_scope_lambda_config)

  environment_variables = merge(local.shared_environment, local.env_tables)

  lambda_function_name = "extra-scope-verifyBiometrics"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect  = "Allow",
      Actions = ["dynamodb:Query"],
      Resource = [
        local.arn_auth_transactions_table,
        local.arn_rate_limiting_table,
        local.arn_rate_limiting_indexes
      ]
    },
    {
      Effect  = "Allow",
      Actions = ["dynamodb:PutItem"],
      Resource = [
        local.arn_rate_limiting_table,
        local.arn_auth_codes_table
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:UpdateItem"],
      Resource = [local.arn_auth_transactions_table]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:DeleteItem"],
      Resource = [local.arn_auth_transactions_table]
    },
    {
      Effect   = "Allow",
      Actions  = ["ssm:GetParameter"],
      Resource = [local.arn_rate_limiting_param]
    },
    {
      Effect   = "Allow",
      Actions  = ["s3:GetObject"],
      Resource = ["${aws_s3_bucket.scope_to_resource_map_bucket.arn}/*"]
    },
  ]
  memory_size = 2048
  timeout     = 30
}



# -- forgotten-passcode

# logged out
module "forgot-pass-authorize-out" {
  source         = "app.terraform.io/onmo/module-lambda-function/aws"
  version        = "1.0.0"
  service_config = local.service_config
  lambda_config  = merge(local.shared_lambda_config, local.forgotten_passcode_lambda_config)

  environment_variables = merge(
    local.shared_environment,
    local.env_card,
    local.env_tables,
    local.env_params
  )

  lambda_function_name = "forgot-pass-authorize-out"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect  = "Allow",
      Actions = ["dynamodb:Query"],
      Resource = [
        local.arn_user_table,
        local.arn_user_table_indexes,
        local.arn_auth_transactions_table,
        local.arn_auth_transactions_indexes,
        local.arn_rate_limiting_table,
        local.arn_rate_limiting_indexes,
      ]
    },
    {
      Effect  = "Allow"
      Actions = ["dynamodb:GetItem"],
      Resource = [
        local.arn_user_table,
      ]
    },
    {
      Effect  = "Allow",
      Actions = ["dynamodb:PutItem"],
      Resource = [
        local.arn_auth_transactions_table,
        local.arn_rate_limiting_table
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:DeleteItem"],
      Resource = [local.arn_auth_transactions_table]
    },
    {
      Effect  = "Allow",
      Actions = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"],
      Resource = [
        local.secret_mambu,
        local.secret_directdebit,
        local.secret_posthog,
        local.secret_service_layer
      ]
    },
    {
      Effect  = "Allow",
      Actions = ["ssm:GetParameter"],
      Resource = [
        local.arn_rate_limiting_param,
        aws_ssm_parameter.exclusive_scopes.arn,
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["s3:GetObject"],
      Resource = ["${aws_s3_bucket.scope_to_resource_map_bucket.arn}/*"]
    },
  ]
  memory_size = 2048
  timeout     = 30
}

# logged in
module "forgot-pass-authorize-in" {
  source         = "app.terraform.io/onmo/module-lambda-function/aws"
  version        = "1.0.0"
  service_config = local.service_config
  lambda_config  = merge(local.shared_lambda_config, local.forgotten_passcode_lambda_config)

  environment_variables = merge(
    local.shared_environment,
    local.env_card,
    local.env_params,
    local.env_tables
  )

  lambda_function_name = "forgot-pass-authorize-in"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect  = "Allow",
      Actions = ["dynamodb:Query"],
      Resource = [
        local.arn_user_table,
        local.arn_auth_transactions_table,
        local.arn_auth_transactions_indexes,
        local.arn_rate_limiting_table,
        local.arn_rate_limiting_indexes
      ]
    },
    {
      Effect   = "Allow"
      Actions  = ["dynamodb:GetItem"],
      Resource = [local.arn_user_table]
    },
    {
      Effect  = "Allow",
      Actions = ["dynamodb:PutItem"],
      Resource = [
        local.arn_auth_transactions_table,
        local.arn_rate_limiting_table
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:DeleteItem"],
      Resource = [local.arn_auth_transactions_table]
    },
    {
      Effect  = "Allow",
      Actions = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"],
      Resource = [
        local.secret_mambu,
        local.secret_directdebit,
        local.secret_posthog,
        local.secret_service_layer
      ]
    },
    {
      Effect  = "Allow",
      Actions = ["ssm:GetParameter"],
      Resource = [
        local.arn_rate_limiting_param,
        aws_ssm_parameter.non_conflicting_scope_groups.arn,
        aws_ssm_parameter.exclusive_scopes.arn,
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["s3:GetObject"],
      Resource = ["${aws_s3_bucket.scope_to_resource_map_bucket.arn}/*"]
    },
  ]
  memory_size = 2048
  timeout     = 30
}

module "forgot-pass-sendOTP" {
  source         = "app.terraform.io/onmo/module-lambda-function/aws"
  version        = "1.0.0"
  service_config = local.service_config
  lambda_config  = merge(local.shared_lambda_config, local.forgotten_passcode_lambda_config)

  environment_variables = merge(local.shared_environment, local.env_sfmc, local.env_tables)

  lambda_function_name = "forgot-pass-sendOTP"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect  = "Allow",
      Actions = ["dynamodb:Query"],
      Resource = [
        local.arn_auth_transactions_table,
        local.arn_rate_limiting_table,
        local.arn_rate_limiting_indexes
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:UpdateItem"],
      Resource = [local.arn_auth_transactions_table]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:DeleteItem"],
      Resource = [local.arn_auth_transactions_table]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:PutItem"],
      Resource = [local.arn_rate_limiting_table]
    },
    {
      Effect  = "Allow",
      Actions = ["mobiletargeting:SendMessages"],
      Resource = [local.pinpoint_messages_arn,
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["mobiletargeting:UpdateEndpoint"]
      Resource = [local.pinpoint_endpoints_arn]
    },
    {
      Effect   = "Allow",
      Actions  = ["mobiletargeting:PhoneNumberValidate"],
      Resource = [local.pinpoint_phone_validate_arn]
    },
    {
      Effect   = "Allow",
      Actions  = ["ssm:GetParameter"],
      Resource = [local.arn_rate_limiting_param]
    },
    {
      Effect   = "Allow",
      Actions  = ["s3:GetObject"],
      Resource = ["${aws_s3_bucket.scope_to_resource_map_bucket.arn}/*"]
    },
    {
      Effect  = "Allow"
      Actions = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"]
      Resource = [
        local.secret_sfmc,
        local.secret_sfdc_connection,
        local.secret_posthog,
      ]
    }
  ]
  memory_size = 2048
  timeout     = 30
}

module "forgot-pass-resendOTP" {
  source         = "app.terraform.io/onmo/module-lambda-function/aws"
  version        = "1.0.0"
  service_config = local.service_config
  lambda_config  = merge(local.shared_lambda_config, local.forgotten_passcode_lambda_config)

  environment_variables = merge(local.shared_environment, local.env_tables, local.env_sfmc)

  lambda_function_name = "forgot-pass-resendOTP"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect  = "Allow",
      Actions = ["dynamodb:Query"],
      Resource = [
        local.arn_auth_transactions_table,
        local.arn_rate_limiting_table,
        local.arn_rate_limiting_indexes
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:UpdateItem"],
      Resource = [local.arn_auth_transactions_table]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:DeleteItem"],
      Resource = [local.arn_auth_transactions_table]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:PutItem"],
      Resource = [local.arn_rate_limiting_table]
    },
    {
      Effect  = "Allow",
      Actions = ["mobiletargeting:SendMessages"],
      Resource = [local.pinpoint_messages_arn,
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["mobiletargeting:UpdateEndpoint"]
      Resource = [local.pinpoint_endpoints_arn]
    },
    {
      Effect   = "Allow",
      Actions  = ["mobiletargeting:PhoneNumberValidate"],
      Resource = [local.pinpoint_phone_validate_arn]
    },
    {
      Effect   = "Allow",
      Actions  = ["ssm:GetParameter"],
      Resource = [local.arn_rate_limiting_param]
    },
    {
      Effect   = "Allow",
      Actions  = ["s3:GetObject"],
      Resource = ["${aws_s3_bucket.scope_to_resource_map_bucket.arn}/*"]
    },
    {
      Effect  = "Allow"
      Actions = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"]
      Resource = [
        local.secret_sfmc,
        local.secret_sfdc_connection
      ]
    }
  ]
  memory_size = 2048
  timeout     = 30
}

module "forgot-pass-verifyOTP" {
  source         = "app.terraform.io/onmo/module-lambda-function/aws"
  version        = "1.0.0"
  service_config = local.service_config
  lambda_config  = merge(local.shared_lambda_config, local.forgotten_passcode_lambda_config)

  environment_variables = merge(local.shared_environment, local.env_tables)

  lambda_function_name = "forgot-pass-verifyOTP"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect  = "Allow",
      Actions = ["dynamodb:Query"],
      Resource = [
        local.arn_auth_transactions_table,
        local.arn_rate_limiting_table,
        local.arn_rate_limiting_indexes
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:PutItem"],
      Resource = [local.arn_rate_limiting_table]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:UpdateItem"],
      Resource = [local.arn_auth_transactions_table]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:DeleteItem"],
      Resource = [local.arn_auth_transactions_table]
    },
    {
      Effect   = "Allow",
      Actions  = ["ssm:GetParameter"],
      Resource = [local.arn_rate_limiting_param]
    },
    {
      Effect   = "Allow",
      Actions  = ["s3:GetObject"],
      Resource = ["${aws_s3_bucket.scope_to_resource_map_bucket.arn}/*"]
    },
  ]
  memory_size = 2048
  timeout     = 30
}

module "forgot-pass-sendEmail" {
  source         = "app.terraform.io/onmo/module-lambda-function/aws"
  version        = "1.0.0"
  service_config = local.service_config
  lambda_config  = merge(local.shared_lambda_config, local.forgotten_passcode_lambda_config)

  environment_variables = merge(local.shared_environment, local.env_tables, {
    API_VERSION = local.api_version
  })

  lambda_function_name = "forgot-pass-sendEmail"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect  = "Allow",
      Actions = ["dynamodb:Query"],
      Resource = [
        local.arn_auth_transactions_table,
        local.arn_rate_limiting_table,
        local.arn_rate_limiting_indexes
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:UpdateItem"],
      Resource = [local.arn_auth_transactions_table]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:DeleteItem"],
      Resource = [local.arn_auth_transactions_table]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:PutItem"],
      Resource = [local.arn_rate_limiting_table]
    },
    {
      Effect   = "Allow",
      Actions  = ["secretsmanager:GetSecretValue"],
      Resource = [local.secret_sendgrid]
    },
    {
      Effect   = "Allow",
      Actions  = ["ssm:GetParameter"],
      Resource = [local.arn_rate_limiting_param]
    },
    {
      Effect   = "Allow",
      Actions  = ["s3:GetObject"],
      Resource = ["${aws_s3_bucket.scope_to_resource_map_bucket.arn}/*"]
    },
  ]
  memory_size = 2048
  timeout     = 30
}

module "forgot-pass-resendEmail" {
  source         = "app.terraform.io/onmo/module-lambda-function/aws"
  version        = "1.0.0"
  service_config = local.service_config
  lambda_config  = merge(local.shared_lambda_config, local.forgotten_passcode_lambda_config)

  environment_variables = merge(local.shared_environment, local.env_tables, {
    API_VERSION = local.api_version
  })

  lambda_function_name = "forgot-pass-resendEmail"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect  = "Allow",
      Actions = ["dynamodb:Query"],
      Resource = [
        local.arn_auth_transactions_table,
        local.arn_rate_limiting_table,
        local.arn_rate_limiting_indexes
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:UpdateItem"],
      Resource = [local.arn_auth_transactions_table]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:DeleteItem"],
      Resource = [local.arn_auth_transactions_table]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:PutItem"],
      Resource = [local.arn_rate_limiting_table]
    },
    {
      Effect   = "Allow",
      Actions  = ["secretsmanager:GetSecretValue"],
      Resource = [local.secret_sendgrid]
    },
    {
      Effect   = "Allow",
      Actions  = ["ssm:GetParameter"],
      Resource = [local.arn_rate_limiting_param]
    },
    {
      Effect   = "Allow",
      Actions  = ["s3:GetObject"],
      Resource = ["${aws_s3_bucket.scope_to_resource_map_bucket.arn}/*"]
    },
  ]
  memory_size = 2048
  timeout     = 30
}

module "forgot-pass-redirect" {
  source         = "app.terraform.io/onmo/module-lambda-function/aws"
  version        = "1.0.0"
  service_config = local.service_config
  lambda_config  = merge(local.shared_lambda_config, local.forgotten_passcode_lambda_config)

  environment_variables = merge(local.shared_environment, local.env_tables)

  lambda_function_name = "forgot-pass-redirect"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect  = "Allow",
      Actions = ["dynamodb:Query"],
      Resource = [
        local.arn_auth_transactions_table,
        local.arn_rate_limiting_table,
        local.arn_rate_limiting_indexes
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:PutItem"],
      Resource = [local.arn_rate_limiting_table]
    },
    {
      Effect   = "Allow",
      Actions  = ["ssm:GetParameter"],
      Resource = [local.arn_rate_limiting_param]
    },
    {
      Effect   = "Allow",
      Actions  = ["s3:GetObject"],
      Resource = ["${aws_s3_bucket.scope_to_resource_map_bucket.arn}/*"]
    },
  ]
  memory_size = 2048
  timeout     = 30
}

module "forgot-pass-verifyEmail" {
  source         = "app.terraform.io/onmo/module-lambda-function/aws"
  version        = "1.0.0"
  service_config = local.service_config
  lambda_config  = merge(local.shared_lambda_config, local.forgotten_passcode_lambda_config)

  environment_variables = merge(local.shared_environment, local.env_tables)

  lambda_function_name = "forgot-pass-verifyEmail"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect  = "Allow",
      Actions = ["dynamodb:Query"],
      Resource = [
        local.arn_auth_transactions_table,
        local.arn_rate_limiting_table,
        local.arn_rate_limiting_indexes
      ]
    },
    {
      Effect  = "Allow",
      Actions = ["dynamodb:PutItem"],
      Resource = [
        local.arn_rate_limiting_table,
        local.arn_auth_codes_table
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:UpdateItem"],
      Resource = [local.arn_auth_transactions_table]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:DeleteItem"],
      Resource = [local.arn_auth_transactions_table]
    },
    {
      Effect   = "Allow",
      Actions  = ["ssm:GetParameter"],
      Resource = [local.arn_rate_limiting_param]
    },
    {
      Effect   = "Allow",
      Actions  = ["s3:GetObject"],
      Resource = ["${aws_s3_bucket.scope_to_resource_map_bucket.arn}/*"]
    },
  ]
  memory_size = 2048
  timeout     = 30
}



# -- other

module "changePasscode" {
  source         = "app.terraform.io/onmo/module-lambda-function/aws"
  version        = "1.0.0"
  service_config = local.service_config
  lambda_config  = merge(local.shared_lambda_config, local.other_lambda_config)

  environment_variables = merge(local.shared_environment, local.env_tables, local.env_params)

  lambda_function_name = "changePasscode"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect  = "Allow",
      Actions = ["dynamodb:Query"],
      Resource = [
        local.arn_rate_limiting_table,
        local.arn_rate_limiting_indexes
      ]
    },
    {
      Effect  = "Allow",
      Actions = ["dynamodb:GetItem"],
      Resource = [
        local.arn_legacy_auth_table,
        local.arn_legacy_rsa_table
      ]
    },
    {
      Effect  = "Allow",
      Actions = ["dynamodb:PutItem"],
      Resource = [
        local.arn_legacy_auth_backup_table,
        local.arn_legacy_rsa_backup_table,
        local.arn_rate_limiting_table,
        local.arn_auth_hashes_table
      ]
    },
    {
      Effect  = "Allow",
      Actions = ["dynamodb:UpdateItem"],
      Resource = [
        local.arn_legacy_auth_table,
        local.arn_legacy_rsa_table,
        local.arn_auth_hashes_table
      ]
    },
    {
      Effect  = "Allow",
      Actions = ["dynamodb:DeleteItem"],
      Resource = [
        local.arn_legacy_auth_table,
        local.arn_legacy_rsa_table,
        local.arn_auth_hashes_table
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["secretsmanager:GetSecretValue"],
      Resource = [local.secret_onmo]
    },
    {
      Effect   = "Allow",
      Actions  = ["ssm:GetParameter"],
      Resource = [local.arn_rate_limiting_param]
    },
    {
      Effect   = "Allow",
      Actions  = ["s3:GetObject"],
      Resource = ["${aws_s3_bucket.scope_to_resource_map_bucket.arn}/*"]
    },
  ]
  memory_size = 2048
  timeout     = 30
}

module "userInfo" {
  source         = "app.terraform.io/onmo/module-lambda-function/aws"
  version        = "1.0.0"
  service_config = local.service_config
  lambda_config  = merge(local.shared_lambda_config, local.other_lambda_config)

  environment_variables = merge(local.shared_environment, local.env_card, local.env_tables)

  lambda_function_name = "userInfo"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect  = "Allow",
      Actions = ["dynamodb:Query"],
      Resource = [
        local.arn_user_table,
        local.arn_user_table_indexes,
      ]
    },
    {
      Effect  = "Allow"
      Actions = ["dynamodb:GetItem"],
      Resource = [
        local.arn_user_table,
      ]
    },
    {
      Effect  = "Allow",
      Actions = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"],
      Resource = [
        local.secret_mambu,
        local.secret_directdebit,
        local.secret_posthog,
        local.secret_service_layer
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["s3:GetObject"],
      Resource = ["${aws_s3_bucket.scope_to_resource_map_bucket.arn}/*"]
    },
  ]
  memory_size = 2048
  timeout     = 30
}

module "stats" {
  source         = "app.terraform.io/onmo/module-lambda-function/aws"
  version        = "1.0.0"
  service_config = local.service_config
  lambda_config  = merge(local.shared_lambda_config, local.other_lambda_config)

  environment_variables = merge(local.shared_environment, local.env_tables, local.env_params)

  lambda_function_name = "stats"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:Scan"]
      Resource = [local.arn_auth_tokens_table]
    },
    {
      Effect   = "Allow",
      Actions  = ["ssm:GetParameter"],
      Resource = [aws_ssm_parameter.staff_onmouuids.arn]
    },
    {
      Effect   = "Allow",
      Actions  = ["s3:GetObject"],
      Resource = ["${aws_s3_bucket.scope_to_resource_map_bucket.arn}/*"]
    },
  ]
  memory_size = 2048
  timeout     = 30
}

module "statsHistory" {
  source         = "app.terraform.io/onmo/module-lambda-function/aws"
  version        = "1.0.0"
  service_config = local.service_config
  lambda_config  = merge(local.shared_lambda_config, local.other_lambda_config)

  environment_variables = merge(local.shared_environment, local.env_tables, local.env_params)

  lambda_function_name = "statsHistory"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:Scan"]
      Resource = [local.arn_auth_hashes_table]
    },
    {
      Effect   = "Allow",
      Actions  = ["ssm:GetParameter"],
      Resource = [aws_ssm_parameter.staff_onmouuids.arn]
    },
    {
      Effect   = "Allow",
      Actions  = ["s3:GetObject"],
      Resource = ["${aws_s3_bucket.scope_to_resource_map_bucket.arn}/*"]
    },
  ]
  memory_size = 2048
  timeout     = 30
}

# TODO: move this to credit card onboarding service when live
module "appDownloadRedirect" {
  source         = "app.terraform.io/onmo/module-lambda-function/aws"
  version        = "1.0.0"
  service_config = local.service_config
  lambda_config  = merge(local.shared_lambda_config, local.other_lambda_config)

  environment_variables = merge(local.shared_environment, local.env_params)

  lambda_function_name = "appDownloadRedirect"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect   = "Allow",
      Actions  = ["ssm:GetParameter"],
      Resource = [aws_ssm_parameter.download_app_redirect_url_config.arn]
    },
    {
      Effect   = "Allow",
      Actions  = ["s3:GetObject"],
      Resource = ["${aws_s3_bucket.scope_to_resource_map_bucket.arn}/*"]
    },
  ]
  memory_size = 2048
  timeout     = 30
}

module "email-change-initiate" {
  source         = "app.terraform.io/onmo/module-lambda-function/aws"
  version        = "1.0.0"
  service_config = local.service_config
  lambda_config  = merge(local.shared_lambda_config, local.email_change_lambda_config)

  environment_variables = merge(local.shared_environment, local.env_tables, {
    API_VERSION = local.api_version
  })

  lambda_function_name = "email-change-initiate"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect  = "Allow",
      Actions = ["dynamodb:Query"],
      Resource = [
        local.arn_auth_transactions_table,
        local.arn_rate_limiting_table,
        local.arn_rate_limiting_indexes
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:UpdateItem"],
      Resource = [local.arn_auth_transactions_table]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:PutItem"],
      Resource = [local.arn_rate_limiting_table]
    },
    {
      Effect   = "Allow",
      Actions  = ["secretsmanager:GetSecretValue"],
      Resource = [local.secret_sendgrid]
    },
    {
      Effect   = "Allow",
      Actions  = ["ssm:GetParameter"],
      Resource = [local.arn_rate_limiting_param]
    },
    {
      Effect   = "Allow",
      Actions  = ["s3:GetObject"],
      Resource = ["${aws_s3_bucket.scope_to_resource_map_bucket.arn}/*"]
    },
  ]
  memory_size = 2048
  timeout     = 30
}

module "email-change-redirect" {
  source         = "app.terraform.io/onmo/module-lambda-function/aws"
  version        = "1.0.0"
  service_config = local.service_config
  lambda_config  = merge(local.shared_lambda_config, local.email_change_lambda_config)

  environment_variables = merge(local.shared_environment, local.env_tables)

  lambda_function_name = "email-change-redirect"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect  = "Allow",
      Actions = ["dynamodb:Query"],
      Resource = [
        local.arn_auth_transactions_table,
        local.arn_rate_limiting_table,
        local.arn_rate_limiting_indexes
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:PutItem"],
      Resource = [local.arn_rate_limiting_table]
    },
    {
      Effect   = "Allow",
      Actions  = ["ssm:GetParameter"],
      Resource = [local.arn_rate_limiting_param]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:UpdateItem"],
      Resource = [local.arn_auth_transactions_table]
    },
    {
      Effect   = "Allow",
      Actions  = ["s3:GetObject"],
      Resource = ["${aws_s3_bucket.scope_to_resource_map_bucket.arn}/*"]
    },
  ]
  memory_size = 2048
  timeout     = 30
}

module "email-change-validate" {
  source         = "app.terraform.io/onmo/module-lambda-function/aws"
  version        = "1.0.0"
  service_config = local.service_config
  lambda_config  = merge(local.shared_lambda_config, local.email_change_lambda_config)

  environment_variables = merge(local.shared_environment, local.env_tables)

  lambda_function_name = "email-change-validate"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect  = "Allow",
      Actions = ["dynamodb:Query"],
      Resource = [
        local.arn_auth_transactions_table,
        local.arn_rate_limiting_table,
        local.arn_rate_limiting_indexes
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:UpdateItem"],
      Resource = [local.arn_auth_transactions_table]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:PutItem"],
      Resource = [local.arn_rate_limiting_table]
    },
    {
      Effect   = "Allow",
      Actions  = ["ssm:GetParameter"],
      Resource = [local.arn_rate_limiting_param]
    },
    {
      Effect   = "Allow",
      Actions  = ["s3:GetObject"],
      Resource = ["${aws_s3_bucket.scope_to_resource_map_bucket.arn}/*"]
    },
  ]
  memory_size = 2048
  timeout     = 30
}

module "email-change-email-resend" {
  source         = "app.terraform.io/onmo/module-lambda-function/aws"
  version        = "1.0.0"
  service_config = local.service_config
  lambda_config  = merge(local.shared_lambda_config, local.email_change_lambda_config)

  environment_variables = merge(local.shared_environment, local.env_tables)

  lambda_function_name = "email-change-email-resend"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect  = "Allow",
      Actions = ["dynamodb:Query"],
      Resource = [
        local.arn_auth_transactions_table,
        local.arn_rate_limiting_table,
        local.arn_rate_limiting_indexes
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:UpdateItem"],
      Resource = [local.arn_auth_transactions_table]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:PutItem"],
      Resource = [local.arn_rate_limiting_table]
    },
    {
      Effect   = "Allow",
      Actions  = ["ssm:GetParameter"],
      Resource = [local.arn_rate_limiting_param]
    },
    {
      Effect   = "Allow",
      Actions  = ["secretsmanager:GetSecretValue"],
      Resource = [local.secret_sendgrid]
    },
    {
      Effect   = "Allow",
      Actions  = ["s3:GetObject"],
      Resource = ["${aws_s3_bucket.scope_to_resource_map_bucket.arn}/*"]
    },
  ]
  memory_size = 2048
  timeout     = 30
}

module "phone-change-initiate" {
  source         = "app.terraform.io/onmo/module-lambda-function/aws"
  version        = "1.0.0"
  service_config = local.service_config
  lambda_config  = merge(local.shared_lambda_config, local.phone_change_lambda_config)

  environment_variables = merge(local.shared_environment, local.env_sfmc, local.env_tables, {
    API_VERSION = local.api_version
  })

  lambda_function_name = "phone-change-initiate"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect  = "Allow",
      Actions = ["dynamodb:Query"],
      Resource = [
        local.arn_auth_transactions_table,
        local.arn_rate_limiting_table,
        local.arn_rate_limiting_indexes
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:UpdateItem"],
      Resource = [local.arn_auth_transactions_table]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:PutItem"],
      Resource = [local.arn_rate_limiting_table]
    },
    {
      Effect   = "Allow",
      Actions  = ["ssm:GetParameter"],
      Resource = [local.arn_rate_limiting_param]
    },
    {
      Effect  = "Allow",
      Actions = ["mobiletargeting:SendMessages"],
      Resource = [local.pinpoint_messages_arn,
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["mobiletargeting:UpdateEndpoint"]
      Resource = [local.pinpoint_endpoints_arn]
    },
    {
      Effect   = "Allow",
      Actions  = ["mobiletargeting:PhoneNumberValidate"],
      Resource = [local.pinpoint_phone_validate_arn]
    },
    {
      Effect   = "Allow",
      Actions  = ["s3:GetObject"],
      Resource = ["${aws_s3_bucket.scope_to_resource_map_bucket.arn}/*"]
    },
    {
      Effect  = "Allow"
      Actions = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"]
      Resource = [
        local.secret_sfmc,
        local.secret_sfdc_connection,
        local.secret_posthog,
      ]
    }
  ]
  memory_size = 2048
  timeout     = 30
}

module "phone-change-validate-otp" {
  source         = "app.terraform.io/onmo/module-lambda-function/aws"
  version        = "1.0.0"
  service_config = local.service_config
  lambda_config  = merge(local.shared_lambda_config, local.phone_change_lambda_config)

  environment_variables = merge(local.shared_environment, local.env_tables, local.env_card)

  lambda_function_name = "phone-change-validate-otp"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect  = "Allow",
      Actions = ["dynamodb:Query"],
      Resource = [
        local.arn_auth_transactions_table,
        local.arn_user_table,
        local.arn_user_table_indexes,
        local.arn_rate_limiting_table,
        local.arn_rate_limiting_indexes
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:GetItem"],
      Resource = [local.arn_user_table]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:UpdateItem", "dynamodb:DeleteItem"],
      Resource = [local.arn_auth_transactions_table]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:PutItem"],
      Resource = [local.arn_rate_limiting_table]
    },
    {
      Effect   = "Allow",
      Actions  = ["ssm:GetParameter"],
      Resource = [local.arn_rate_limiting_param]
    },
    {
      Effect  = "Allow",
      Actions = ["secretsmanager:GetSecretValue"],
      Resource = [
        local.secret_mambu_wildcard,
        local.secret_posthog,
        local.secret_service_layer
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["s3:GetObject"],
      Resource = ["${aws_s3_bucket.scope_to_resource_map_bucket.arn}/*"]
    },
  ]
  memory_size = 2048
  timeout     = 30
}

module "phone-change-email-send" {
  source         = "app.terraform.io/onmo/module-lambda-function/aws"
  version        = "1.0.0"
  service_config = local.service_config
  lambda_config  = merge(local.shared_lambda_config, local.phone_change_lambda_config)

  environment_variables = merge(local.shared_environment, local.env_tables, local.env_misc)

  lambda_function_name = "phone-change-email-send"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect  = "Allow",
      Actions = ["dynamodb:Query"],
      Resource = [
        local.arn_auth_transactions_table,
        local.arn_rate_limiting_table,
        local.arn_rate_limiting_indexes
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:UpdateItem"],
      Resource = [local.arn_auth_transactions_table]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:PutItem"],
      Resource = [local.arn_rate_limiting_table]
    },
    {
      Effect   = "Allow",
      Actions  = ["ssm:GetParameter"],
      Resource = [local.arn_rate_limiting_param]
    },
    {
      Effect   = "Allow",
      Actions  = ["secretsmanager:GetSecretValue"],
      Resource = [local.secret_sendgrid]
    },
    {
      Effect   = "Allow",
      Actions  = ["s3:GetObject"],
      Resource = ["${aws_s3_bucket.scope_to_resource_map_bucket.arn}/*"]
    },
  ]
  memory_size = 2048
  timeout     = 30
}

module "phone-change-email-verify" {
  source         = "app.terraform.io/onmo/module-lambda-function/aws"
  version        = "1.0.0"
  service_config = local.service_config
  lambda_config  = merge(local.shared_lambda_config, local.phone_change_lambda_config)

  environment_variables = merge(local.shared_environment, local.env_tables)

  lambda_function_name = "phone-change-email-verify"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect  = "Allow",
      Actions = ["dynamodb:Query"],
      Resource = [
        local.arn_auth_transactions_table,
        local.arn_rate_limiting_table,
        local.arn_rate_limiting_indexes
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:UpdateItem"],
      Resource = [local.arn_auth_transactions_table]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:PutItem"],
      Resource = [local.arn_rate_limiting_table]
    },
    {
      Effect   = "Allow",
      Actions  = ["ssm:GetParameter"],
      Resource = [local.arn_rate_limiting_param]
    },
    {
      Effect   = "Allow",
      Actions  = ["s3:GetObject"],
      Resource = ["${aws_s3_bucket.scope_to_resource_map_bucket.arn}/*"]
    },
  ]
  memory_size = 2048
  timeout     = 30
}

module "phone-change-email-redirect" {
  source         = "app.terraform.io/onmo/module-lambda-function/aws"
  version        = "1.0.0"
  service_config = local.service_config
  lambda_config  = merge(local.shared_lambda_config, local.phone_change_lambda_config)

  environment_variables = merge(local.shared_environment, local.env_tables)

  lambda_function_name = "phone-change-email-redirect"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect  = "Allow",
      Actions = ["dynamodb:Query", "dynamodb:UpdateItem"],
      Resource = [
        local.arn_auth_transactions_table,
        local.arn_rate_limiting_table,
        local.arn_rate_limiting_indexes
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:PutItem"],
      Resource = [local.arn_rate_limiting_table]
    },
    {
      Effect   = "Allow",
      Actions  = ["ssm:GetParameter"],
      Resource = [local.arn_rate_limiting_param]
    },
    {
      Effect   = "Allow",
      Actions  = ["s3:GetObject"],
      Resource = ["${aws_s3_bucket.scope_to_resource_map_bucket.arn}/*"]
    },
  ]
  memory_size = 2048
  timeout     = 30
}

module "phone-change-email-resend" {
  source         = "app.terraform.io/onmo/module-lambda-function/aws"
  version        = "1.0.0"
  service_config = local.service_config
  lambda_config  = merge(local.shared_lambda_config, local.phone_change_lambda_config)

  environment_variables = merge(local.shared_environment, local.env_tables)

  lambda_function_name = "phone-change-email-resend"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect  = "Allow",
      Actions = ["dynamodb:Query"],
      Resource = [
        local.arn_auth_transactions_table,
        local.arn_rate_limiting_table,
        local.arn_rate_limiting_indexes
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:UpdateItem"],
      Resource = [local.arn_auth_transactions_table]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:PutItem"],
      Resource = [local.arn_rate_limiting_table]
    },
    {
      Effect   = "Allow",
      Actions  = ["ssm:GetParameter"],
      Resource = [local.arn_rate_limiting_param]
    },
    {
      Effect   = "Allow",
      Actions  = ["secretsmanager:GetSecretValue"],
      Resource = [local.secret_sendgrid]
    },
    {
      Effect   = "Allow",
      Actions  = ["s3:GetObject"],
      Resource = ["${aws_s3_bucket.scope_to_resource_map_bucket.arn}/*"]
    },
  ]
  memory_size = 2048
  timeout     = 30
}

module "phone-change-otp-resend" {
  source         = "app.terraform.io/onmo/module-lambda-function/aws"
  version        = "1.0.0"
  service_config = local.service_config
  lambda_config  = merge(local.shared_lambda_config, local.phone_change_lambda_config)

  environment_variables = merge(local.shared_environment, local.env_sfmc, local.env_tables)

  lambda_function_name = "phone-change-otp-resend"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect  = "Allow",
      Actions = ["dynamodb:Query"],
      Resource = [
        local.arn_auth_transactions_table,
        local.arn_rate_limiting_table,
        local.arn_rate_limiting_indexes
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:UpdateItem"],
      Resource = [local.arn_auth_transactions_table]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:PutItem"],
      Resource = [local.arn_rate_limiting_table]
    },
    {
      Effect   = "Allow",
      Actions  = ["ssm:GetParameter"],
      Resource = [local.arn_rate_limiting_param]
    },
    {
      Effect  = "Allow",
      Actions = ["mobiletargeting:SendMessages"],
      Resource = [local.pinpoint_messages_arn,
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["mobiletargeting:UpdateEndpoint"]
      Resource = [local.pinpoint_endpoints_arn]
    },
    {
      Effect   = "Allow",
      Actions  = ["mobiletargeting:PhoneNumberValidate"],
      Resource = [local.pinpoint_phone_validate_arn]
    },
    {
      Effect   = "Allow",
      Actions  = ["s3:GetObject"],
      Resource = ["${aws_s3_bucket.scope_to_resource_map_bucket.arn}/*"]
    },
    {
      Effect  = "Allow"
      Actions = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"]
      Resource = [
        local.secret_sfmc,
        local.secret_sfdc_connection,
        local.secret_posthog,
      ]
    }
  ]
  memory_size = 2048
  timeout     = 30
}

module "email-change-otp-resend" {
  source         = "app.terraform.io/onmo/module-lambda-function/aws"
  version        = "1.0.0"
  service_config = local.service_config
  lambda_config  = merge(local.shared_lambda_config, local.email_change_lambda_config)

  environment_variables = merge(local.shared_environment, local.env_sfmc, local.env_tables)

  lambda_function_name = "email-change-otp-resend"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect  = "Allow",
      Actions = ["dynamodb:Query"],
      Resource = [
        local.arn_auth_transactions_table,
        local.arn_rate_limiting_table,
        local.arn_rate_limiting_indexes
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:UpdateItem"],
      Resource = [local.arn_auth_transactions_table]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:PutItem"],
      Resource = [local.arn_rate_limiting_table]
    },
    {
      Effect   = "Allow",
      Actions  = ["ssm:GetParameter"],
      Resource = [local.arn_rate_limiting_param]
    },
    {
      Effect  = "Allow",
      Actions = ["mobiletargeting:SendMessages"],
      Resource = [local.pinpoint_messages_arn,
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["mobiletargeting:UpdateEndpoint"]
      Resource = [local.pinpoint_endpoints_arn]
    },
    {
      Effect   = "Allow",
      Actions  = ["mobiletargeting:PhoneNumberValidate"],
      Resource = [local.pinpoint_phone_validate_arn]
    },
    {
      Effect   = "Allow",
      Actions  = ["s3:GetObject"],
      Resource = ["${aws_s3_bucket.scope_to_resource_map_bucket.arn}/*"]
    },
    {
      Effect  = "Allow"
      Actions = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"]
      Resource = [
        local.secret_sfmc,
        local.secret_sfdc_connection,
        local.secret_posthog,
      ]
    }
  ]
  memory_size = 2048
  timeout     = 30
}
