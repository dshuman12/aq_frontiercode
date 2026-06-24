locals {
  secret_prefix  = "arn:aws:secretsmanager:${var.REGION}:${var.AWS_ACCOUNT_ID}:secret"
  dynamo_prefix  = "arn:aws:dynamodb:${var.REGION}:${var.AWS_ACCOUNT_ID}:table"
  mobile_prefix  = "arn:aws:mobiletargeting:${var.REGION}:${var.AWS_ACCOUNT_ID}"
  gateway_prefix = "arn:aws:execute-api:${var.REGION}:${var.AWS_ACCOUNT_ID}"
  param_prefix   = "arn:aws:ssm:${var.REGION}:${var.AWS_ACCOUNT_ID}:parameter"

  api_version = "v5"
}


# -- general

module "authorizer" {
  source         = "app.terraform.io/onmo/module-lambda-function/aws"
  version        = "1.0.0"
  service_config = local.service_config
  lambda_config  = merge(local.shared_lambda_config, local.general_lambda_config)
  vpc_config     = local.paymentology_vpc_config

  environment_variables = merge(local.shared_environment, {
    AUTH_TOKENS_TABLE                   = var.AUTH_TOKENS_TABLE,
    ONMO_AUTH_URL                       = var.ONMO_AUTH_URL,
    ONMO_API_URL                        = var.ONMO_API_URL,
    APR_GATEWAY_ID                      = var.APR_GATEWAY_ID,
    CUSTOMER_CARE_GATEWAY_ID            = var.CUSTOMER_CARE_GATEWAY_ID,
    API_BROKER_GATEWAY_ID               = var.API_BROKER_GATEWAY_ID,
    AUTHENTICATION_GATEWAY_ID           = var.AUTHENTICATION_GATEWAY_ID,
    CARD_SERVICE_OIDC_GATEWAY_ID        = var.CARD_SERVICE_OIDC_GATEWAY_ID,
    ACCOUNT_SERVICE_OIDC_GATEWAY_ID     = var.ACCOUNT_SERVICE_OIDC_GATEWAY_ID,
    TRANSACTION_SERVICE_OIDC_GATEWAY_ID = var.TRANSACTION_SERVICE_OIDC_GATEWAY_ID,
    DEVICE_CHANNEL_GATEWAY_ID           = var.DEVICE_CHANNEL_GATEWAY_ID,
    CUSTOMER_SERVICE_OIDC_GATEWAY_ID    = var.CUSTOMER_SERVICE_OIDC_GATEWAY_ID,
    REPAYMENT_SERVICE_GATEWAY_ID        = var.REPAYMENT_SERVICE_GATEWAY_ID,
    ALERT_SERVICE_OIDC_GATEWAY_ID       = var.ALERT_SERVICE_OIDC_GATEWAY_ID,
    AUTH_FLOW_SCOPES_PARAM              = var.AUTH_FLOW_SCOPES_PARAM,
    SCOPE_TO_RESOURCE_MAP_PARAM         = var.SCOPE_TO_RESOURCE_MAP_PARAM,
    SCOPE_TO_RESOURCE_MAP_URL_PARAM     = var.SCOPE_TO_RESOURCE_MAP_URL_PARAM,
  })

  lambda_function_name = "authorizer"

  execution_from = [
    { service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn },
    { service = "APIGateway", source_arn = "${local.gateway_prefix}:${var.CUSTOMER_CARE_GATEWAY_ID}" },
    { service = "APIGateway", source_arn = "${local.gateway_prefix}:${var.API_BROKER_GATEWAY_ID}" },
    { service = "APIGateway", source_arn = "${local.gateway_prefix}:${var.CARD_SERVICE_OIDC_GATEWAY_ID}" },
    { service = "APIGateway", source_arn = "${local.gateway_prefix}:${var.ACCOUNT_SERVICE_OIDC_GATEWAY_ID}" },
    { service = "APIGateway", source_arn = "${local.gateway_prefix}:${var.CUSTOMER_SERVICE_OIDC_GATEWAY_ID}" },
    { service = "APIGateway", source_arn = "${local.gateway_prefix}:${var.REPAYMENT_SERVICE_GATEWAY_ID}" },
    { service = "APIGateway", source_arn = "${local.gateway_prefix}:${var.ALERT_SERVICE_OIDC_GATEWAY_ID}" },
    { service = "APIGateway", source_arn = "${local.gateway_prefix}:${var.TRANSACTION_SERVICE_OIDC_GATEWAY_ID}" },
    { service = "APIGateway", source_arn = "${local.gateway_prefix}:${var.DEVICE_CHANNEL_GATEWAY_ID}" },
  ]
  permission_statements = [
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:Query"],
      Resource = ["${local.dynamo_prefix}/${var.AUTH_TOKENS_TABLE}"]
    },
    {
      Effect   = "Allow",
      Actions  = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"],
      Resource = ["${local.secret_prefix}:onmo-auth-signing-keys-${var.ENVIRONMENT}*"]
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

  environment_variables = merge(local.shared_environment, {
    USER_TABLE                = var.USER_TABLE,
    AUTH_TRANSACTIONS_TABLE   = var.AUTH_TRANSACTIONS_TABLE,
    APR_INCREASES_TABLE       = var.APR_INCREASES_TABLE,
    AUTH_CODES_TABLE          = var.AUTH_CODES_TABLE,
    AUTH_REFRESH_TOKENS_TABLE = var.AUTH_REFRESH_TOKENS_TABLE,
    AUTH_TOKENS_TABLE         = var.AUTH_TOKENS_TABLE,
    ONMO_AUTH_URL             = var.ONMO_AUTH_URL,
    ONMO_API_URL              = var.ONMO_API_URL,
    EXCLUSIVE_SCOPES_PARAM    = var.EXCLUSIVE_SCOPES_PARAM,
    TOKEN_LIFETIMES_PARAM     = var.TOKEN_LIFETIMES_PARAM
  })

  lambda_function_name = "token"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect   = "Allow",
      Actions  = ["secretsmanager:GetSecretValue"],
      Resource = ["${local.secret_prefix}:onmo-auth-signing-keys-${var.ENVIRONMENT}*"]
    },
    {
      Effect  = "Allow",
      Actions = ["dynamodb:Query"],
      Resource = [
        "${local.dynamo_prefix}/${var.USER_TABLE}",
        "${local.dynamo_prefix}/${var.USER_TABLE}/index/*",
        "${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}",
        "${local.dynamo_prefix}/${var.AUTH_CODES_TABLE}",
        "${local.dynamo_prefix}/${var.AUTH_TOKENS_TABLE}",
        "${local.dynamo_prefix}/${var.AUTH_TOKENS_TABLE}/index/*",
        "${local.dynamo_prefix}/${var.AUTH_REFRESH_TOKENS_TABLE}",
        "${local.dynamo_prefix}/${var.AUTH_REFRESH_TOKENS_TABLE}/index/*",
        "${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}",
        "${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}/index/*"
      ]
    },
    {
      Effect  = "Allow",
      Actions = ["dynamodb:DeleteItem"],
      Resource = [
        "${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}",
        "${local.dynamo_prefix}/${var.AUTH_TOKENS_TABLE}",
        "${local.dynamo_prefix}/${var.AUTH_REFRESH_TOKENS_TABLE}",
        "${local.dynamo_prefix}/${var.AUTH_CODES_TABLE}"
      ]
    },
    {
      Effect  = "Allow",
      Actions = ["dynamodb:PutItem"],
      Resource = [
        "${local.dynamo_prefix}/${var.AUTH_TOKENS_TABLE}",
        "${local.dynamo_prefix}/${var.AUTH_REFRESH_TOKENS_TABLE}",
        "${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}"
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:UpdateItem"],
      Resource = ["${local.dynamo_prefix}/${var.USER_TABLE}"]
    },
    {
      Effect  = "Allow",
      Actions = ["ssm:GetParameter"],
      Resource = [
        aws_ssm_parameter.exclusive_scopes.arn,
        "${local.param_prefix}${var.RATE_LIMITING_PARAM}",
        "${local.param_prefix}${var.TOKEN_LIFETIMES_PARAM}"
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

  environment_variables = merge(local.shared_environment, {
    AUTH_TOKENS_TABLE         = var.AUTH_TOKENS_TABLE,
    AUTH_REFRESH_TOKENS_TABLE = var.AUTH_REFRESH_TOKENS_TABLE,
    EXCLUSIVE_SCOPES_PARAM    = var.EXCLUSIVE_SCOPES_PARAM
  })

  lambda_function_name = "logout"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect  = "Allow",
      Actions = ["dynamodb:Query"],
      Resource = [
        "${local.dynamo_prefix}/${var.AUTH_TOKENS_TABLE}",
        "${local.dynamo_prefix}/${var.AUTH_TOKENS_TABLE}/index/*",
        "${local.dynamo_prefix}/${var.AUTH_REFRESH_TOKENS_TABLE}",
        "${local.dynamo_prefix}/${var.AUTH_REFRESH_TOKENS_TABLE}/index/*",
        "${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}",
        "${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}/index/*"
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:PutItem"],
      Resource = ["${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}"]
    },
    {
      Effect  = "Allow",
      Actions = ["dynamodb:DeleteItem"],
      Resource = [
        "${local.dynamo_prefix}/${var.AUTH_TOKENS_TABLE}",
        "${local.dynamo_prefix}/${var.AUTH_REFRESH_TOKENS_TABLE}",
      ]
    },
    {
      Effect  = "Allow",
      Actions = ["ssm:GetParameter"],
      Resource = [
        "${local.param_prefix}${var.RATE_LIMITING_PARAM}",
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

  environment_variables = merge(local.shared_environment, {
    USER_TABLE                     = var.USER_TABLE,
    AUTH_FLOW_SCOPES_PARAM         = var.AUTH_FLOW_SCOPES_PARAM,
    CUSTOMER_TO_CARD_MAPPING_TABLE = var.CUSTOMER_TO_CARD_MAPPING_TABLE,
    QA_BYPASS_CUSTOMER_IDS         = var.QA_BYPASS_CUSTOMER_IDS
  })

  lambda_function_name = "eligibility"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect  = "Allow",
      Actions = ["dynamodb:Query"],
      Resource = [
        "${local.dynamo_prefix}/${var.USER_TABLE}",
        "${local.dynamo_prefix}/${var.USER_TABLE}/index/*",
        "${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}",
        "${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}/index/*",
        "${local.dynamo_prefix}/${var.CUSTOMER_TO_CARD_MAPPING_TABLE}"
      ]
    },
    {
      Effect   = "Allow"
      Actions  = ["dynamodb:GetItem"],
      Resource = ["${local.dynamo_prefix}/${var.USER_TABLE}"]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:PutItem"],
      Resource = ["${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}"]
    },
    {
      Effect  = "Allow",
      Actions = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"],
      Resource = [
        "${local.secret_prefix}:onmo-mambu-${var.ENVIRONMENT}*",
        "${local.secret_prefix}:onmo-directdebit-${var.ENVIRONMENT}*",
        "${local.secret_prefix}:onmo-paymentology-${var.ENVIRONMENT}*",
        "${local.secret_prefix}:onmo-paymentology-ssl-${var.ENVIRONMENT}*",
        "${local.secret_prefix}:onmo-posthog-${var.ENVIRONMENT}*"
      ]
    },
    {
      Effect  = "Allow",
      Actions = ["ssm:GetParameter"],
      Resource = [
        "${local.param_prefix}${var.RATE_LIMITING_PARAM}",
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

  environment_variables = merge(local.shared_environment, {
    USER_TABLE                      = var.USER_TABLE,
    AUTH_TRANSACTIONS_TABLE         = var.AUTH_TRANSACTIONS_TABLE,
    APR_INCREASES_TABLE             = var.APR_INCREASES_TABLE,
    AUTH_FLOW_SCOPES_PARAM          = var.AUTH_FLOW_SCOPES_PARAM,
    SCOPE_TO_RESOURCE_MAP_PARAM     = var.SCOPE_TO_RESOURCE_MAP_PARAM,
    SCOPE_TO_RESOURCE_MAP_URL_PARAM = var.SCOPE_TO_RESOURCE_MAP_URL_PARAM
  })

  lambda_function_name = "authorize"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect  = "Allow",
      Actions = ["dynamodb:Query"],
      Resource = [
        "${local.dynamo_prefix}/${var.USER_TABLE}",
        "${local.dynamo_prefix}/${var.APR_INCREASES_TABLE}"
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:PutItem"],
      Resource = ["${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}"]
    },
    {
      Effect   = "Allow",
      Actions  = ["secretsmanager:GetSecretValue"],
      Resource = ["${local.secret_prefix}:crm_${var.ENVIRONMENT}*"]
    },
    {
      Effect  = "Allow",
      Actions = ["secretsmanager:GetSecretValue"],
      Resource = [
        "${local.secret_prefix}:mambu_${var.ENVIRONMENT}*",
        "${local.secret_prefix}:onmo-posthog-${var.ENVIRONMENT}*"
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

  environment_variables = merge(local.shared_environment, {
    USER_TABLE                       = var.USER_TABLE,
    AUTH_TRANSACTIONS_TABLE          = var.AUTH_TRANSACTIONS_TABLE,
    APR_INCREASES_TABLE              = var.APR_INCREASES_TABLE,
    PINPOINT_PROJECT_ID              = var.PINPOINT_PROJECT_ID,
    STAGE                            = var.ENVIRONMENT,
    NOTIFICATIONS_SFMC_SECRET_NAME   = var.NOTIFICATIONS_SFMC_SECRET_NAME,
    NOTIFICATIONS_SFMC_TOKEN_URL     = var.NOTIFICATIONS_SFMC_TOKEN_URL,
    NOTIFICATIONS_SFMC_COMMS_URL     = var.NOTIFICATIONS_SFMC_COMMS_URL,
    NOTIFICATIONS_SFMC_GRANT_TYPE    = var.NOTIFICATIONS_SFMC_GRANT_TYPE,
    NOTIFICATIONS_SFMC_CLIENT_ID     = var.NOTIFICATIONS_SFMC_CLIENT_ID,
    NOTIFICATIONS_SFMC_ACCOUNT_ID    = var.NOTIFICATIONS_SFMC_ACCOUNT_ID,
    NOTIFICATIONS_SFMC_EVENT_KEY_OTP = var.NOTIFICATIONS_SFMC_EVENT_KEY_OTP
  })

  lambda_function_name = "sendOTP"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect  = "Allow",
      Actions = ["dynamodb:Query"],
      Resource = [
        "${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}",
        "${local.dynamo_prefix}/${var.USER_TABLE}",
        "${local.dynamo_prefix}/${var.USER_TABLE}/index/*"
      ]
    },
    {
      Effect   = "Allow"
      Actions  = ["dynamodb:GetItem"],
      Resource = ["${local.dynamo_prefix}/${var.USER_TABLE}"]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:UpdateItem"],
      Resource = ["${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}"]
    },
    {
      Effect  = "Allow",
      Actions = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"],
      Resource = [
        "${local.secret_prefix}:onmo-mambu-${var.ENVIRONMENT}*",
        "${local.secret_prefix}:onmo-directdebit-${var.ENVIRONMENT}*",
        "${local.secret_prefix}:onmo-posthog-${var.ENVIRONMENT}*"
      ]
    },
    {
      Effect  = "Allow",
      Actions = ["mobiletargeting:SendMessages"],
      Resource = ["${local.mobile_prefix}:apps/${var.PINPOINT_PROJECT_ID}/messages",
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["mobiletargeting:UpdateEndpoint"]
      Resource = ["${local.mobile_prefix}:apps/${var.PINPOINT_PROJECT_ID}/endpoints/*"]
    },
    {
      Effect   = "Allow",
      Actions  = ["mobiletargeting:PhoneNumberValidate"],
      Resource = ["${local.mobile_prefix}:phone/number/validate"]
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
        "${local.secret_prefix}:salesforce-marketing-cloud-${var.ENVIRONMENT}*",
        "${local.secret_prefix}:events!connection/onmo-sales-force-api-connection-${var.ENVIRONMENT}*",
        "${local.secret_prefix}:onmo-posthog-${var.ENVIRONMENT}*",
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

  environment_variables = merge(local.shared_environment, {
    AUTH_CODES_TABLE        = var.AUTH_CODES_TABLE,
    AUTH_TRANSACTIONS_TABLE = var.AUTH_TRANSACTIONS_TABLE,
    APR_INCREASES_TABLE     = var.APR_INCREASES_TABLE
  })

  lambda_function_name = "verifyOTP"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:UpdateItem"],
      Resource = ["${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}"]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:Query"],
      Resource = ["${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}"]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:PutItem"],
      Resource = ["${local.dynamo_prefix}/${var.AUTH_CODES_TABLE}"]
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

  environment_variables = merge(local.shared_environment, {
    USER_TABLE                      = var.USER_TABLE,
    AUTH_TRANSACTIONS_TABLE         = var.AUTH_TRANSACTIONS_TABLE,
    APR_INCREASES_TABLE             = var.APR_INCREASES_TABLE,
    NON_CONFLICTING_SCOPES_PARAM    = var.NON_CONFLICTING_SCOPES_PARAM,
    EXCLUSIVE_SCOPES_PARAM          = var.EXCLUSIVE_SCOPES_PARAM,
    AUTH_FLOW_SCOPES_PARAM          = var.AUTH_FLOW_SCOPES_PARAM,
    SCOPE_TO_RESOURCE_MAP_PARAM     = var.SCOPE_TO_RESOURCE_MAP_PARAM,
    SCOPE_TO_RESOURCE_MAP_URL_PARAM = var.SCOPE_TO_RESOURCE_MAP_URL_PARAM
  })

  lambda_function_name = "otp-passcode-authorize"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect  = "Allow",
      Actions = ["dynamodb:Query"],
      Resource = [
        "${local.dynamo_prefix}/${var.USER_TABLE}",
        "${local.dynamo_prefix}/${var.USER_TABLE}/index/*",
        "${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}",
        "${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}/index/*"
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:PutItem"],
      Resource = ["${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}"]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:DeleteItem"],
      Resource = ["${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}"]
    },
    {
      Effect  = "Allow",
      Actions = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"],
      Resource = [
        "${local.secret_prefix}:onmo-mambu-${var.ENVIRONMENT}*",
        "${local.secret_prefix}:onmo-directdebit-${var.ENVIRONMENT}*",
        "${local.secret_prefix}:onmo-posthog-${var.ENVIRONMENT}*"
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

  environment_variables = merge(local.shared_environment, {
    USER_TABLE                       = var.USER_TABLE,
    AUTH_TRANSACTIONS_TABLE          = var.AUTH_TRANSACTIONS_TABLE,
    PINPOINT_PROJECT_ID              = var.PINPOINT_PROJECT_ID,
    EXCLUSIVE_SCOPES_PARAM           = var.EXCLUSIVE_SCOPES_PARAM,
    APP_TESTER_LOGIN_CONFIG          = var.APP_TESTER_LOGIN_CONFIG,
    NOTIFICATIONS_SFMC_SECRET_NAME   = var.NOTIFICATIONS_SFMC_SECRET_NAME,
    NOTIFICATIONS_SFMC_TOKEN_URL     = var.NOTIFICATIONS_SFMC_TOKEN_URL,
    NOTIFICATIONS_SFMC_COMMS_URL     = var.NOTIFICATIONS_SFMC_COMMS_URL,
    NOTIFICATIONS_SFMC_GRANT_TYPE    = var.NOTIFICATIONS_SFMC_GRANT_TYPE,
    NOTIFICATIONS_SFMC_CLIENT_ID     = var.NOTIFICATIONS_SFMC_CLIENT_ID,
    NOTIFICATIONS_SFMC_ACCOUNT_ID    = var.NOTIFICATIONS_SFMC_ACCOUNT_ID,
    NOTIFICATIONS_SFMC_EVENT_KEY_OTP = var.NOTIFICATIONS_SFMC_EVENT_KEY_OTP
  })

  lambda_function_name = "otp-passcode-sendOTP"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect  = "Allow",
      Actions = ["dynamodb:Query"],
      Resource = [
        "${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}",
        "${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}/index/*",
        "${local.dynamo_prefix}/${var.USER_TABLE}",
        "${local.dynamo_prefix}/${var.USER_TABLE}/index/*",
        "${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}",
        "${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}/index/*"
      ]
    },
    {
      Effect   = "Allow"
      Actions  = ["dynamodb:GetItem"],
      Resource = ["${local.dynamo_prefix}/${var.USER_TABLE}"]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:UpdateItem"],
      Resource = ["${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}"]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:DeleteItem"],
      Resource = ["${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}"]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:PutItem"],
      Resource = ["${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}"]
    },
    {
      Effect  = "Allow",
      Actions = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"],
      Resource = [
        "${local.secret_prefix}:onmo-mambu-${var.ENVIRONMENT}*",
        "${local.secret_prefix}:onmo-directdebit-${var.ENVIRONMENT}*",
        "${local.secret_prefix}:onmo-posthog-${var.ENVIRONMENT}*"
      ]
    },
    {
      Effect  = "Allow",
      Actions = ["mobiletargeting:SendMessages"],
      Resource = ["${local.mobile_prefix}:apps/${var.PINPOINT_PROJECT_ID}/messages",
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["mobiletargeting:UpdateEndpoint"]
      Resource = ["${local.mobile_prefix}:apps/${var.PINPOINT_PROJECT_ID}/endpoints/*"]
    },
    {
      Effect   = "Allow",
      Actions  = ["mobiletargeting:PhoneNumberValidate"],
      Resource = ["${local.mobile_prefix}:phone/number/validate"]
    },
    {
      Effect  = "Allow",
      Actions = ["ssm:GetParameter"],
      Resource = [
        "${local.param_prefix}${var.RATE_LIMITING_PARAM}",
        aws_ssm_parameter.exclusive_scopes.arn,
        "${local.param_prefix}${var.APP_TESTER_LOGIN_CONFIG}"
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
        "${local.secret_prefix}:salesforce-marketing-cloud-${var.ENVIRONMENT}*",
        "${local.secret_prefix}:events!connection/onmo-sales-force-api-connection-${var.ENVIRONMENT}*",
        "${local.secret_prefix}:onmo-posthog-${var.ENVIRONMENT}*",
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

  environment_variables = merge(local.shared_environment, {
    AUTH_TRANSACTIONS_TABLE          = var.AUTH_TRANSACTIONS_TABLE,
    PINPOINT_PROJECT_ID              = var.PINPOINT_PROJECT_ID,
    APP_TESTER_LOGIN_CONFIG          = var.APP_TESTER_LOGIN_CONFIG,
    NOTIFICATIONS_SFMC_SECRET_NAME   = var.NOTIFICATIONS_SFMC_SECRET_NAME,
    NOTIFICATIONS_SFMC_TOKEN_URL     = var.NOTIFICATIONS_SFMC_TOKEN_URL,
    NOTIFICATIONS_SFMC_COMMS_URL     = var.NOTIFICATIONS_SFMC_COMMS_URL,
    NOTIFICATIONS_SFMC_GRANT_TYPE    = var.NOTIFICATIONS_SFMC_GRANT_TYPE,
    NOTIFICATIONS_SFMC_CLIENT_ID     = var.NOTIFICATIONS_SFMC_CLIENT_ID,
    NOTIFICATIONS_SFMC_ACCOUNT_ID    = var.NOTIFICATIONS_SFMC_ACCOUNT_ID,
    NOTIFICATIONS_SFMC_EVENT_KEY_OTP = var.NOTIFICATIONS_SFMC_EVENT_KEY_OTP
  })

  lambda_function_name = "otp-passcode-resendOTP"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect  = "Allow",
      Actions = ["dynamodb:Query"],
      Resource = [
        "${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}",
        "${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}",
        "${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}/index/*"
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:UpdateItem"],
      Resource = ["${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}"]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:DeleteItem"],
      Resource = ["${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}"]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:PutItem"],
      Resource = ["${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}"]
    },
    {
      Effect  = "Allow",
      Actions = ["mobiletargeting:SendMessages"],
      Resource = ["${local.mobile_prefix}:apps/${var.PINPOINT_PROJECT_ID}/messages",
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["mobiletargeting:UpdateEndpoint"]
      Resource = ["${local.mobile_prefix}:apps/${var.PINPOINT_PROJECT_ID}/endpoints/*"]
    },
    {
      Effect   = "Allow",
      Actions  = ["mobiletargeting:PhoneNumberValidate"],
      Resource = ["${local.mobile_prefix}:phone/number/validate"]
    },
    {
      Effect  = "Allow",
      Actions = ["ssm:GetParameter"],
      Resource = [
        "${local.param_prefix}${var.RATE_LIMITING_PARAM}",
        "${local.param_prefix}${var.APP_TESTER_LOGIN_CONFIG}"
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
        "${local.secret_prefix}:salesforce-marketing-cloud-${var.ENVIRONMENT}*",
        "${local.secret_prefix}:events!connection/onmo-sales-force-api-connection-${var.ENVIRONMENT}*",
        "${local.secret_prefix}:onmo-posthog-${var.ENVIRONMENT}*",
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

  environment_variables = merge(local.shared_environment, {
    AUTH_TRANSACTIONS_TABLE = var.AUTH_TRANSACTIONS_TABLE,
  })

  lambda_function_name = "otp-passcode-verifyOTP"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect  = "Allow",
      Actions = ["dynamodb:Query"],
      Resource = [
        "${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}",
        "${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}",
        "${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}/index/*"
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:UpdateItem"],
      Resource = ["${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}"]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:DeleteItem"],
      Resource = ["${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}"]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:PutItem"],
      Resource = ["${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}"]
    },
    {
      Effect   = "Allow",
      Actions  = ["ssm:GetParameter"],
      Resource = ["${local.param_prefix}${var.RATE_LIMITING_PARAM}"]
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

  environment_variables = merge(local.shared_environment, {
    AUTH_CODES_TABLE         = var.AUTH_CODES_TABLE,
    AUTH_HASHES_TABLE        = var.AUTH_HASHES_TABLE,
    AUTH_TRANSACTIONS_TABLE  = var.AUTH_TRANSACTIONS_TABLE,
    LEGACY_AUTH_TABLE        = var.LEGACY_AUTH_TABLE,
    LEGACY_RSA_TABLE         = var.LEGACY_RSA_TABLE,
    LEGACY_AUTH_BACKUP_TABLE = var.LEGACY_AUTH_BACKUP_TABLE,
    LEGACY_RSA_BACKUP_TABLE  = var.LEGACY_RSA_BACKUP_TABLE,
    APP_TESTER_LOGIN_CONFIG  = var.APP_TESTER_LOGIN_CONFIG
  })

  lambda_function_name = "otp-passcode-verifyPasscode"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect  = "Allow",
      Actions = ["dynamodb:Query"],
      Resource = [
        "${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}",
        "${local.dynamo_prefix}/${var.AUTH_HASHES_TABLE}",
        "${local.dynamo_prefix}/${var.LEGACY_AUTH_TABLE}",
        "${local.dynamo_prefix}/${var.LEGACY_RSA_TABLE}",
        "${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}",
        "${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}/index/*"
      ]
    },
    {
      Effect  = "Allow",
      Actions = ["dynamodb:GetItem"],
      Resource = [
        "${local.dynamo_prefix}/${var.LEGACY_AUTH_TABLE}",
        "${local.dynamo_prefix}/${var.LEGACY_RSA_TABLE}",
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:UpdateItem"],
      Resource = ["${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}"]
    },
    {
      Effect  = "Allow",
      Actions = ["dynamodb:PutItem"],
      Resource = [
        "${local.dynamo_prefix}/${var.AUTH_CODES_TABLE}",
        "${local.dynamo_prefix}/${var.AUTH_HASHES_TABLE}",
        "${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}",
        "${local.dynamo_prefix}/${var.LEGACY_AUTH_BACKUP_TABLE}",
        "${local.dynamo_prefix}/${var.LEGACY_RSA_BACKUP_TABLE}",
      ]
    },
    {
      Effect  = "Allow",
      Actions = ["dynamodb:DeleteItem"],
      Resource = [
        "${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}",
        "${local.dynamo_prefix}/${var.LEGACY_AUTH_TABLE}",
        "${local.dynamo_prefix}/${var.LEGACY_RSA_TABLE}",
        "${local.dynamo_prefix}/${var.AUTH_HASHES_TABLE}",
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"],
      Resource = ["${local.secret_prefix}:onmo*"]
    },
    {
      Effect  = "Allow",
      Actions = ["ssm:GetParameter"],
      Resource = [
        "${local.param_prefix}${var.RATE_LIMITING_PARAM}",
        "${local.param_prefix}${var.APP_TESTER_LOGIN_CONFIG}"
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

  environment_variables = merge(local.shared_environment, {
    USER_TABLE              = var.USER_TABLE,
    AUTH_TRANSACTIONS_TABLE = var.AUTH_TRANSACTIONS_TABLE,
    EXCLUSIVE_SCOPES_PARAM  = var.EXCLUSIVE_SCOPES_PARAM,
  })

  lambda_function_name = "biometrics-reg-initiate"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect  = "Allow",
      Actions = ["dynamodb:Query"],
      Resource = [
        "${local.dynamo_prefix}/${var.USER_TABLE}",
        "${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}",
        "${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}/index/*",
        "${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}",
        "${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}/index/*"
      ]
    },
    {
      Effect   = "Allow"
      Actions  = ["dynamodb:GetItem"],
      Resource = ["${local.dynamo_prefix}/${var.USER_TABLE}"]
    },
    {
      Effect  = "Allow",
      Actions = ["dynamodb:PutItem"],
      Resource = [
        "${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}",
        "${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}"
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:DeleteItem"],
      Resource = ["${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}"]
    },
    {
      Effect  = "Allow",
      Actions = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"],
      Resource = [
        "${local.secret_prefix}:onmo-mambu-${var.ENVIRONMENT}*",
        "${local.secret_prefix}:onmo-directdebit-${var.ENVIRONMENT}*",
        "${local.secret_prefix}:onmo-posthog-${var.ENVIRONMENT}*"
      ]
    },
    {
      Effect  = "Allow",
      Actions = ["ssm:GetParameter"],
      Resource = [
        "${local.param_prefix}${var.RATE_LIMITING_PARAM}",
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

  environment_variables = merge(local.shared_environment, {
    USER_TABLE              = var.USER_TABLE,
    AUTH_TRANSACTIONS_TABLE = var.AUTH_TRANSACTIONS_TABLE,
    AUTH_KEYS_TABLE         = var.AUTH_KEYS_TABLE
  })

  lambda_function_name = "biometrics-reg-complete"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect  = "Allow",
      Actions = ["dynamodb:Query"],
      Resource = [
        "${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}",
        "${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}",
        "${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}/index/*",
        "${local.dynamo_prefix}/${var.AUTH_KEYS_TABLE}",
        "${local.dynamo_prefix}/${var.AUTH_KEYS_TABLE}/index/*"
      ]
    },
    {
      Effect  = "Allow",
      Actions = ["dynamodb:PutItem"],
      Resource = [
        "${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}",
        "${local.dynamo_prefix}/${var.AUTH_KEYS_TABLE}"
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:UpdateItem"],
      Resource = ["${local.dynamo_prefix}/${var.AUTH_KEYS_TABLE}"]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:DeleteItem"],
      Resource = ["${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}"]
    },
    {
      Effect   = "Allow",
      Actions  = ["ssm:GetParameter"],
      Resource = ["${local.param_prefix}${var.RATE_LIMITING_PARAM}"]
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

  environment_variables = merge(local.shared_environment, {
    USER_TABLE                      = var.USER_TABLE,
    AUTH_TRANSACTIONS_TABLE         = var.AUTH_TRANSACTIONS_TABLE,
    AUTH_KEYS_TABLE                 = var.AUTH_KEYS_TABLE,
    NON_CONFLICTING_SCOPES_PARAM    = var.NON_CONFLICTING_SCOPES_PARAM,
    EXCLUSIVE_SCOPES_PARAM          = var.EXCLUSIVE_SCOPES_PARAM,
    AUTH_FLOW_SCOPES_PARAM          = var.AUTH_FLOW_SCOPES_PARAM,
    SCOPE_TO_RESOURCE_MAP_PARAM     = var.SCOPE_TO_RESOURCE_MAP_PARAM,
    SCOPE_TO_RESOURCE_MAP_URL_PARAM = var.SCOPE_TO_RESOURCE_MAP_URL_PARAM
  })

  lambda_function_name = "biometrics-authorize"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect  = "Allow",
      Actions = ["dynamodb:Query"],
      Resource = [
        "${local.dynamo_prefix}/${var.USER_TABLE}",
        "${local.dynamo_prefix}/${var.USER_TABLE}/index/*",
        "${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}",
        "${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}/index/*",
        "${local.dynamo_prefix}/${var.AUTH_KEYS_TABLE}",
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:PutItem"],
      Resource = ["${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}"]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:DeleteItem"],
      Resource = ["${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}"]
    },
    {
      Effect  = "Allow",
      Actions = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"],
      Resource = [
        "${local.secret_prefix}:onmo-mambu-${var.ENVIRONMENT}*",
        "${local.secret_prefix}:onmo-directdebit-${var.ENVIRONMENT}*",
        "${local.secret_prefix}:onmo-posthog-${var.ENVIRONMENT}*"
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

  environment_variables = merge(local.shared_environment, {
    AUTH_CODES_TABLE        = var.AUTH_CODES_TABLE,
    AUTH_TRANSACTIONS_TABLE = var.AUTH_TRANSACTIONS_TABLE,
  })

  lambda_function_name = "biometrics-verify"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect  = "Allow",
      Actions = ["dynamodb:Query"],
      Resource = [
        "${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}",
        "${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}",
        "${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}/index/*"
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:UpdateItem"],
      Resource = ["${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}"]
    },
    {
      Effect  = "Allow",
      Actions = ["dynamodb:PutItem"],
      Resource = [
        "${local.dynamo_prefix}/${var.AUTH_CODES_TABLE}",
        "${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}"
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:DeleteItem"],
      Resource = ["${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}"]
    },
    {
      Effect   = "Allow",
      Actions  = ["ssm:GetParameter"],
      Resource = ["${local.param_prefix}${var.RATE_LIMITING_PARAM}"]
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

  environment_variables = merge(local.shared_environment, {
    USER_TABLE                      = var.USER_TABLE,
    AUTH_TRANSACTIONS_TABLE         = var.AUTH_TRANSACTIONS_TABLE,
    AUTH_KEYS_TABLE                 = var.AUTH_KEYS_TABLE,
    NON_CONFLICTING_SCOPES_PARAM    = var.NON_CONFLICTING_SCOPES_PARAM,
    EXCLUSIVE_SCOPES_PARAM          = var.EXCLUSIVE_SCOPES_PARAM,
    AUTH_FLOW_SCOPES_PARAM          = var.AUTH_FLOW_SCOPES_PARAM,
    SCOPE_TO_RESOURCE_MAP_PARAM     = var.SCOPE_TO_RESOURCE_MAP_PARAM,
    SCOPE_TO_RESOURCE_MAP_URL_PARAM = var.SCOPE_TO_RESOURCE_MAP_URL_PARAM
    CUSTOMER_TO_CARD_MAPPING_TABLE  = var.CUSTOMER_TO_CARD_MAPPING_TABLE
  })

  lambda_function_name = "extra-scope-authorize"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect  = "Allow",
      Actions = ["dynamodb:Query"],
      Resource = [
        "${local.dynamo_prefix}/${var.USER_TABLE}",
        "${local.dynamo_prefix}/${var.USER_TABLE}/index/*",
        "${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}",
        "${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}/index/*",
        "${local.dynamo_prefix}/${var.AUTH_KEYS_TABLE}",
        "${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}",
        "${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}/index/*",
        "${local.dynamo_prefix}/${var.CUSTOMER_TO_CARD_MAPPING_TABLE}"
      ]
    },
    {
      Effect   = "Allow"
      Actions  = ["dynamodb:GetItem"],
      Resource = ["${local.dynamo_prefix}/${var.USER_TABLE}"]
    },
    {
      Effect  = "Allow",
      Actions = ["dynamodb:PutItem"],
      Resource = [
        "${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}",
        "${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}",
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:DeleteItem"],
      Resource = ["${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}"]
    },
    {
      Effect  = "Allow",
      Actions = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"],
      Resource = [
        "${local.secret_prefix}:onmo-mambu-${var.ENVIRONMENT}*",
        "${local.secret_prefix}:onmo-directdebit-${var.ENVIRONMENT}*",
        "${local.secret_prefix}:onmo-paymentology-${var.ENVIRONMENT}*",
        "${local.secret_prefix}:onmo-paymentology-ssl-${var.ENVIRONMENT}*",
        "${local.secret_prefix}:onmo-posthog-${var.ENVIRONMENT}*"
      ]
    },
    {
      Effect  = "Allow",
      Actions = ["ssm:GetParameter"],
      Resource = [
        "${local.param_prefix}${var.RATE_LIMITING_PARAM}",
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

  environment_variables = merge(local.shared_environment, {
    USER_TABLE                       = var.USER_TABLE,
    AUTH_TRANSACTIONS_TABLE          = var.AUTH_TRANSACTIONS_TABLE,
    PINPOINT_PROJECT_ID              = var.PINPOINT_PROJECT_ID,
    NOTIFICATIONS_SFMC_SECRET_NAME   = var.NOTIFICATIONS_SFMC_SECRET_NAME,
    NOTIFICATIONS_SFMC_TOKEN_URL     = var.NOTIFICATIONS_SFMC_TOKEN_URL,
    NOTIFICATIONS_SFMC_COMMS_URL     = var.NOTIFICATIONS_SFMC_COMMS_URL,
    NOTIFICATIONS_SFMC_GRANT_TYPE    = var.NOTIFICATIONS_SFMC_GRANT_TYPE,
    NOTIFICATIONS_SFMC_CLIENT_ID     = var.NOTIFICATIONS_SFMC_CLIENT_ID,
    NOTIFICATIONS_SFMC_ACCOUNT_ID    = var.NOTIFICATIONS_SFMC_ACCOUNT_ID,
    NOTIFICATIONS_SFMC_EVENT_KEY_OTP = var.NOTIFICATIONS_SFMC_EVENT_KEY_OTP
  })

  lambda_function_name = "extra-scope-sendOTP"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect  = "Allow",
      Actions = ["dynamodb:Query"],
      Resource = [
        "${local.dynamo_prefix}/${var.USER_TABLE}",
        "${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}",
        "${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}",
        "${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}/index/*"
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:PutItem"],
      Resource = ["${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}"]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:UpdateItem"],
      Resource = ["${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}"]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:DeleteItem"],
      Resource = ["${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}"]
    },
    {
      Effect  = "Allow",
      Actions = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"],
      Resource = [
        "${local.secret_prefix}:onmo-mambu-${var.ENVIRONMENT}*",
        "${local.secret_prefix}:onmo-directdebit-${var.ENVIRONMENT}*"
      ]
    },
    {
      Effect  = "Allow",
      Actions = ["mobiletargeting:SendMessages"],
      Resource = ["${local.mobile_prefix}:apps/${var.PINPOINT_PROJECT_ID}/messages",
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["mobiletargeting:UpdateEndpoint"]
      Resource = ["${local.mobile_prefix}:apps/${var.PINPOINT_PROJECT_ID}/endpoints/*"]
    },
    {
      Effect   = "Allow",
      Actions  = ["mobiletargeting:PhoneNumberValidate"],
      Resource = ["${local.mobile_prefix}:phone/number/validate"]
    },
    {
      Effect   = "Allow",
      Actions  = ["ssm:GetParameter"],
      Resource = ["${local.param_prefix}${var.RATE_LIMITING_PARAM}"]
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
        "${local.secret_prefix}:salesforce-marketing-cloud-${var.ENVIRONMENT}*",
        "${local.secret_prefix}:events!connection/onmo-sales-force-api-connection-${var.ENVIRONMENT}*",
        "${local.secret_prefix}:onmo-posthog-${var.ENVIRONMENT}*",
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

  environment_variables = merge(local.shared_environment, {
    AUTH_TRANSACTIONS_TABLE          = var.AUTH_TRANSACTIONS_TABLE,
    PINPOINT_PROJECT_ID              = var.PINPOINT_PROJECT_ID,
    NOTIFICATIONS_SFMC_SECRET_NAME   = var.NOTIFICATIONS_SFMC_SECRET_NAME,
    NOTIFICATIONS_SFMC_TOKEN_URL     = var.NOTIFICATIONS_SFMC_TOKEN_URL,
    NOTIFICATIONS_SFMC_COMMS_URL     = var.NOTIFICATIONS_SFMC_COMMS_URL,
    NOTIFICATIONS_SFMC_GRANT_TYPE    = var.NOTIFICATIONS_SFMC_GRANT_TYPE,
    NOTIFICATIONS_SFMC_CLIENT_ID     = var.NOTIFICATIONS_SFMC_CLIENT_ID,
    NOTIFICATIONS_SFMC_ACCOUNT_ID    = var.NOTIFICATIONS_SFMC_ACCOUNT_ID,
    NOTIFICATIONS_SFMC_EVENT_KEY_OTP = var.NOTIFICATIONS_SFMC_EVENT_KEY_OTP
  })

  lambda_function_name = "extra-scope-resendOTP"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect  = "Allow",
      Actions = ["dynamodb:Query"],
      Resource = [
        "${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}",
        "${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}",
        "${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}/index/*"
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:PutItem"],
      Resource = ["${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}"]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:UpdateItem"],
      Resource = ["${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}"]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:DeleteItem"],
      Resource = ["${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}"]
    },
    {
      Effect  = "Allow",
      Actions = ["mobiletargeting:SendMessages"],
      Resource = ["${local.mobile_prefix}:apps/${var.PINPOINT_PROJECT_ID}/messages",
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["mobiletargeting:UpdateEndpoint"]
      Resource = ["${local.mobile_prefix}:apps/${var.PINPOINT_PROJECT_ID}/endpoints/*"]
    },
    {
      Effect   = "Allow",
      Actions  = ["mobiletargeting:PhoneNumberValidate"],
      Resource = ["${local.mobile_prefix}:phone/number/validate"]
    },
    {
      Effect   = "Allow",
      Actions  = ["ssm:GetParameter"],
      Resource = ["${local.param_prefix}${var.RATE_LIMITING_PARAM}"]
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
        "${local.secret_prefix}:salesforce-marketing-cloud-${var.ENVIRONMENT}*",
        "${local.secret_prefix}:events!connection/onmo-sales-force-api-connection-${var.ENVIRONMENT}*",
        "${local.secret_prefix}:onmo-posthog-${var.ENVIRONMENT}*",
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

  environment_variables = merge(local.shared_environment, {
    AUTH_TRANSACTIONS_TABLE = var.AUTH_TRANSACTIONS_TABLE,
  })

  lambda_function_name = "extra-scope-verifyOTP"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect  = "Allow",
      Actions = ["dynamodb:Query"],
      Resource = [
        "${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}",
        "${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}",
        "${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}/index/*"
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:PutItem"],
      Resource = ["${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}"]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:UpdateItem"],
      Resource = ["${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}"]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:DeleteItem"],
      Resource = ["${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}"]
    },
    {
      Effect   = "Allow",
      Actions  = ["ssm:GetParameter"],
      Resource = ["${local.param_prefix}${var.RATE_LIMITING_PARAM}"]
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

  environment_variables = merge(local.shared_environment, {
    AUTH_CODES_TABLE        = var.AUTH_CODES_TABLE,
    AUTH_HASHES_TABLE       = var.AUTH_HASHES_TABLE,
    AUTH_TRANSACTIONS_TABLE = var.AUTH_TRANSACTIONS_TABLE,
    LEGACY_AUTH_TABLE       = var.LEGACY_AUTH_TABLE,
    LEGACY_RSA_TABLE        = var.LEGACY_RSA_TABLE,
  })

  lambda_function_name = "extra-scope-verifyPasscode"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect  = "Allow",
      Actions = ["dynamodb:Query"],
      Resource = [
        "${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}",
        "${local.dynamo_prefix}/${var.AUTH_HASHES_TABLE}",
        "${local.dynamo_prefix}/${var.LEGACY_AUTH_TABLE}",
        "${local.dynamo_prefix}/${var.LEGACY_RSA_TABLE}",
        "${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}",
        "${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}/index/*"
      ]
    },
    {
      Effect  = "Allow",
      Actions = ["dynamodb:PutItem"],
      Resource = [
        "${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}",
        "${local.dynamo_prefix}/${var.AUTH_CODES_TABLE}"
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:UpdateItem"],
      Resource = ["${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}"]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:DeleteItem"],
      Resource = ["${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}"]
    },
    {
      Effect   = "Allow",
      Actions  = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"],
      Resource = ["${local.secret_prefix}:onmo*"]
    },
    {
      Effect   = "Allow",
      Actions  = ["ssm:GetParameter"],
      Resource = ["${local.param_prefix}${var.RATE_LIMITING_PARAM}"]
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

  environment_variables = merge(local.shared_environment, {
    AUTH_CODES_TABLE        = var.AUTH_CODES_TABLE,
    AUTH_TRANSACTIONS_TABLE = var.AUTH_TRANSACTIONS_TABLE
  })

  lambda_function_name = "extra-scope-verifyBiometrics"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect  = "Allow",
      Actions = ["dynamodb:Query"],
      Resource = [
        "${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}",
        "${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}",
        "${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}/index/*"
      ]
    },
    {
      Effect  = "Allow",
      Actions = ["dynamodb:PutItem"],
      Resource = [
        "${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}",
        "${local.dynamo_prefix}/${var.AUTH_CODES_TABLE}"
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:UpdateItem"],
      Resource = ["${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}"]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:DeleteItem"],
      Resource = ["${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}"]
    },
    {
      Effect   = "Allow",
      Actions  = ["ssm:GetParameter"],
      Resource = ["${local.param_prefix}${var.RATE_LIMITING_PARAM}"]
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

  environment_variables = merge(local.shared_environment, {
    USER_TABLE              = var.USER_TABLE,
    AUTH_TRANSACTIONS_TABLE = var.AUTH_TRANSACTIONS_TABLE,
    EXCLUSIVE_SCOPES_PARAM  = var.EXCLUSIVE_SCOPES_PARAM
  })

  lambda_function_name = "forgot-pass-authorize-out"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect  = "Allow",
      Actions = ["dynamodb:Query"],
      Resource = [
        "${local.dynamo_prefix}/${var.USER_TABLE}",
        "${local.dynamo_prefix}/${var.USER_TABLE}/index/*",
        "${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}",
        "${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}/index/*",
        "${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}",
        "${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}/index/*"
      ]
    },
    {
      Effect   = "Allow"
      Actions  = ["dynamodb:GetItem"],
      Resource = ["${local.dynamo_prefix}/${var.USER_TABLE}"]
    },
    {
      Effect  = "Allow",
      Actions = ["dynamodb:PutItem"],
      Resource = [
        "${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}",
        "${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}"
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:DeleteItem"],
      Resource = ["${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}"]
    },
    {
      Effect  = "Allow",
      Actions = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"],
      Resource = [
        "${local.secret_prefix}:onmo-mambu-${var.ENVIRONMENT}*",
        "${local.secret_prefix}:onmo-directdebit-${var.ENVIRONMENT}*",
        "${local.secret_prefix}:onmo-posthog-${var.ENVIRONMENT}*"
      ]
    },
    {
      Effect  = "Allow",
      Actions = ["ssm:GetParameter"],
      Resource = [
        "${local.param_prefix}${var.RATE_LIMITING_PARAM}",
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

  environment_variables = merge(local.shared_environment, {
    USER_TABLE                   = var.USER_TABLE,
    AUTH_TRANSACTIONS_TABLE      = var.AUTH_TRANSACTIONS_TABLE,
    NON_CONFLICTING_SCOPES_PARAM = var.NON_CONFLICTING_SCOPES_PARAM,
    EXCLUSIVE_SCOPES_PARAM       = var.EXCLUSIVE_SCOPES_PARAM
  })

  lambda_function_name = "forgot-pass-authorize-in"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect  = "Allow",
      Actions = ["dynamodb:Query"],
      Resource = [
        "${local.dynamo_prefix}/${var.USER_TABLE}",
        "${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}",
        "${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}/index/*",
        "${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}",
        "${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}/index/*"
      ]
    },
    {
      Effect   = "Allow"
      Actions  = ["dynamodb:GetItem"],
      Resource = ["${local.dynamo_prefix}/${var.USER_TABLE}"]
    },
    {
      Effect  = "Allow",
      Actions = ["dynamodb:PutItem"],
      Resource = [
        "${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}",
        "${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}"
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:DeleteItem"],
      Resource = ["${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}"]
    },
    {
      Effect  = "Allow",
      Actions = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"],
      Resource = [
        "${local.secret_prefix}:onmo-mambu-${var.ENVIRONMENT}*",
        "${local.secret_prefix}:onmo-directdebit-${var.ENVIRONMENT}*",
        "${local.secret_prefix}:onmo-posthog-${var.ENVIRONMENT}*"
      ]
    },
    {
      Effect  = "Allow",
      Actions = ["ssm:GetParameter"],
      Resource = [
        "${local.param_prefix}${var.RATE_LIMITING_PARAM}",
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

  environment_variables = merge(local.shared_environment, {
    AUTH_TRANSACTIONS_TABLE          = var.AUTH_TRANSACTIONS_TABLE,
    PINPOINT_PROJECT_ID              = var.PINPOINT_PROJECT_ID,
    NOTIFICATIONS_SFMC_SECRET_NAME   = var.NOTIFICATIONS_SFMC_SECRET_NAME,
    NOTIFICATIONS_SFMC_TOKEN_URL     = var.NOTIFICATIONS_SFMC_TOKEN_URL,
    NOTIFICATIONS_SFMC_COMMS_URL     = var.NOTIFICATIONS_SFMC_COMMS_URL,
    NOTIFICATIONS_SFMC_GRANT_TYPE    = var.NOTIFICATIONS_SFMC_GRANT_TYPE,
    NOTIFICATIONS_SFMC_CLIENT_ID     = var.NOTIFICATIONS_SFMC_CLIENT_ID,
    NOTIFICATIONS_SFMC_ACCOUNT_ID    = var.NOTIFICATIONS_SFMC_ACCOUNT_ID,
    NOTIFICATIONS_SFMC_EVENT_KEY_OTP = var.NOTIFICATIONS_SFMC_EVENT_KEY_OTP
  })

  lambda_function_name = "forgot-pass-sendOTP"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect  = "Allow",
      Actions = ["dynamodb:Query"],
      Resource = [
        "${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}",
        "${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}",
        "${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}/index/*"
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:UpdateItem"],
      Resource = ["${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}"]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:DeleteItem"],
      Resource = ["${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}"]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:PutItem"],
      Resource = ["${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}"]
    },
    {
      Effect  = "Allow",
      Actions = ["mobiletargeting:SendMessages"],
      Resource = ["${local.mobile_prefix}:apps/${var.PINPOINT_PROJECT_ID}/messages",
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["mobiletargeting:UpdateEndpoint"]
      Resource = ["${local.mobile_prefix}:apps/${var.PINPOINT_PROJECT_ID}/endpoints/*"]
    },
    {
      Effect   = "Allow",
      Actions  = ["mobiletargeting:PhoneNumberValidate"],
      Resource = ["${local.mobile_prefix}:phone/number/validate"]
    },
    {
      Effect   = "Allow",
      Actions  = ["ssm:GetParameter"],
      Resource = ["${local.param_prefix}${var.RATE_LIMITING_PARAM}"]
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
        "${local.secret_prefix}:salesforce-marketing-cloud-${var.ENVIRONMENT}*",
        "${local.secret_prefix}:events!connection/onmo-sales-force-api-connection-${var.ENVIRONMENT}*",
        "${local.secret_prefix}:onmo-posthog-${var.ENVIRONMENT}*",
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

  environment_variables = merge(local.shared_environment, {
    AUTH_TRANSACTIONS_TABLE = var.AUTH_TRANSACTIONS_TABLE,
    PINPOINT_PROJECT_ID     = var.PINPOINT_PROJECT_ID,
  })

  lambda_function_name = "forgot-pass-resendOTP"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect  = "Allow",
      Actions = ["dynamodb:Query"],
      Resource = [
        "${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}",
        "${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}",
        "${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}/index/*"
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:UpdateItem"],
      Resource = ["${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}"]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:DeleteItem"],
      Resource = ["${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}"]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:PutItem"],
      Resource = ["${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}"]
    },
    {
      Effect  = "Allow",
      Actions = ["mobiletargeting:SendMessages"],
      Resource = ["${local.mobile_prefix}:apps/${var.PINPOINT_PROJECT_ID}/messages",
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["mobiletargeting:UpdateEndpoint"]
      Resource = ["${local.mobile_prefix}:apps/${var.PINPOINT_PROJECT_ID}/endpoints/*"]
    },
    {
      Effect   = "Allow",
      Actions  = ["mobiletargeting:PhoneNumberValidate"],
      Resource = ["${local.mobile_prefix}:phone/number/validate"]
    },
    {
      Effect   = "Allow",
      Actions  = ["ssm:GetParameter"],
      Resource = ["${local.param_prefix}${var.RATE_LIMITING_PARAM}"]
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
        "${local.secret_prefix}:ting-cloud-${var.ENVIRONMENT}*",
        "${local.secret_prefix}:events!connection/onmo-sales-force-api-connection-${var.ENVIRONMENT}*"
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

  environment_variables = merge(local.shared_environment, {
    AUTH_TRANSACTIONS_TABLE = var.AUTH_TRANSACTIONS_TABLE,
  })

  lambda_function_name = "forgot-pass-verifyOTP"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect  = "Allow",
      Actions = ["dynamodb:Query"],
      Resource = [
        "${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}",
        "${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}",
        "${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}/index/*"
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:PutItem"],
      Resource = ["${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}"]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:UpdateItem"],
      Resource = ["${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}"]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:DeleteItem"],
      Resource = ["${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}"]
    },
    {
      Effect   = "Allow",
      Actions  = ["ssm:GetParameter"],
      Resource = ["${local.param_prefix}${var.RATE_LIMITING_PARAM}"]
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

  environment_variables = merge(local.shared_environment, {
    AUTH_TRANSACTIONS_TABLE = var.AUTH_TRANSACTIONS_TABLE,
    API_VERSION             = local.api_version,
  })

  lambda_function_name = "forgot-pass-sendEmail"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect  = "Allow",
      Actions = ["dynamodb:Query"],
      Resource = [
        "${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}",
        "${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}",
        "${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}/index/*"
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:UpdateItem"],
      Resource = ["${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}"]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:DeleteItem"],
      Resource = ["${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}"]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:PutItem"],
      Resource = ["${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}"]
    },
    {
      Effect   = "Allow",
      Actions  = ["secretsmanager:GetSecretValue"],
      Resource = ["${local.secret_prefix}:sendgrid_prod*"]
    },
    {
      Effect   = "Allow",
      Actions  = ["ssm:GetParameter"],
      Resource = ["${local.param_prefix}${var.RATE_LIMITING_PARAM}"]
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

  environment_variables = merge(local.shared_environment, {
    AUTH_TRANSACTIONS_TABLE = var.AUTH_TRANSACTIONS_TABLE,
    API_VERSION             = local.api_version,
  })

  lambda_function_name = "forgot-pass-resendEmail"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect  = "Allow",
      Actions = ["dynamodb:Query"],
      Resource = [
        "${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}",
        "${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}",
        "${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}/index/*"
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:UpdateItem"],
      Resource = ["${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}"]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:DeleteItem"],
      Resource = ["${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}"]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:PutItem"],
      Resource = ["${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}"]
    },
    {
      Effect   = "Allow",
      Actions  = ["secretsmanager:GetSecretValue"],
      Resource = ["${local.secret_prefix}:sendgrid_prod*"]
    },
    {
      Effect   = "Allow",
      Actions  = ["ssm:GetParameter"],
      Resource = ["${local.param_prefix}${var.RATE_LIMITING_PARAM}"]
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

  environment_variables = merge(local.shared_environment, {
    AUTH_TRANSACTIONS_TABLE = var.AUTH_TRANSACTIONS_TABLE,
  })

  lambda_function_name = "forgot-pass-redirect"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect  = "Allow",
      Actions = ["dynamodb:Query"],
      Resource = [
        "${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}",
        "${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}",
        "${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}/index/*"
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:PutItem"],
      Resource = ["${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}"]
    },
    {
      Effect   = "Allow",
      Actions  = ["ssm:GetParameter"],
      Resource = ["${local.param_prefix}${var.RATE_LIMITING_PARAM}"]
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

  environment_variables = merge(local.shared_environment, {
    AUTH_TRANSACTIONS_TABLE = var.AUTH_TRANSACTIONS_TABLE,
    AUTH_CODES_TABLE        = var.AUTH_CODES_TABLE
  })

  lambda_function_name = "forgot-pass-verifyEmail"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect  = "Allow",
      Actions = ["dynamodb:Query"],
      Resource = [
        "${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}",
        "${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}",
        "${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}/index/*"
      ]
    },
    {
      Effect  = "Allow",
      Actions = ["dynamodb:PutItem"],
      Resource = [
        "${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}",
        "${local.dynamo_prefix}/${var.AUTH_CODES_TABLE}"
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:UpdateItem"],
      Resource = ["${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}"]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:DeleteItem"],
      Resource = ["${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}"]
    },
    {
      Effect   = "Allow",
      Actions  = ["ssm:GetParameter"],
      Resource = ["${local.param_prefix}${var.RATE_LIMITING_PARAM}"]
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

  environment_variables = merge(local.shared_environment, {
    LEGACY_AUTH_TABLE        = var.LEGACY_AUTH_TABLE,
    LEGACY_RSA_TABLE         = var.LEGACY_RSA_TABLE,
    LEGACY_AUTH_BACKUP_TABLE = var.LEGACY_AUTH_BACKUP_TABLE,
    LEGACY_RSA_BACKUP_TABLE  = var.LEGACY_RSA_BACKUP_TABLE,
    AUTH_HASHES_TABLE        = var.AUTH_HASHES_TABLE,
    RATE_LIMITING_PARAM      = var.RATE_LIMITING_PARAM
  })

  lambda_function_name = "changePasscode"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect  = "Allow",
      Actions = ["dynamodb:Query"],
      Resource = [
        "${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}",
        "${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}/index/*"
      ]
    },
    {
      Effect  = "Allow",
      Actions = ["dynamodb:GetItem"],
      Resource = [
        "${local.dynamo_prefix}/${var.LEGACY_AUTH_TABLE}",
        "${local.dynamo_prefix}/${var.LEGACY_RSA_TABLE}"
      ]
    },
    {
      Effect  = "Allow",
      Actions = ["dynamodb:PutItem"],
      Resource = [
        "${local.dynamo_prefix}/${var.LEGACY_AUTH_BACKUP_TABLE}",
        "${local.dynamo_prefix}/${var.LEGACY_RSA_BACKUP_TABLE}",
        "${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}",
        "${local.dynamo_prefix}/${var.AUTH_HASHES_TABLE}"
      ]
    },
    {
      Effect  = "Allow",
      Actions = ["dynamodb:UpdateItem"],
      Resource = [
        "${local.dynamo_prefix}/${var.LEGACY_AUTH_TABLE}",
        "${local.dynamo_prefix}/${var.LEGACY_RSA_TABLE}",
        "${local.dynamo_prefix}/${var.AUTH_HASHES_TABLE}"
      ]
    },
    {
      Effect  = "Allow",
      Actions = ["dynamodb:DeleteItem"],
      Resource = [
        "${local.dynamo_prefix}/${var.LEGACY_AUTH_TABLE}",
        "${local.dynamo_prefix}/${var.LEGACY_RSA_TABLE}",
        "${local.dynamo_prefix}/${var.AUTH_HASHES_TABLE}"
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["secretsmanager:GetSecretValue"],
      Resource = ["${local.secret_prefix}:onmo*"]
    },
    {
      Effect   = "Allow",
      Actions  = ["ssm:GetParameter"],
      Resource = ["${local.param_prefix}${var.RATE_LIMITING_PARAM}"]
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

  environment_variables = merge(local.shared_environment, {
    USER_TABLE = var.USER_TABLE
  })

  lambda_function_name = "userInfo"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect  = "Allow",
      Actions = ["dynamodb:Query"],
      Resource = [
        "${local.dynamo_prefix}/${var.USER_TABLE}",
        "${local.dynamo_prefix}/${var.USER_TABLE}/index/*",
      ]
    },
    {
      Effect   = "Allow"
      Actions  = ["dynamodb:GetItem"],
      Resource = ["${local.dynamo_prefix}/${var.USER_TABLE}"]
    },
    {
      Effect  = "Allow",
      Actions = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"],
      Resource = [
        "${local.secret_prefix}:onmo-mambu-${var.ENVIRONMENT}*",
        "${local.secret_prefix}:onmo-directdebit-${var.ENVIRONMENT}*",
        "${local.secret_prefix}:onmo-posthog-${var.ENVIRONMENT}*"
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

  environment_variables = merge(local.shared_environment, {
    AUTH_TOKENS_TABLE     = var.AUTH_TOKENS_TABLE
    STAFF_ONMOUUIDS_PARAM = var.STAFF_ONMOUUIDS_PARAM
  })

  lambda_function_name = "stats"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:Scan"]
      Resource = ["${local.dynamo_prefix}/${var.AUTH_TOKENS_TABLE}"]
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

  environment_variables = merge(local.shared_environment, {
    AUTH_HASHES_TABLE     = var.AUTH_HASHES_TABLE,
    STAFF_ONMOUUIDS_PARAM = var.STAFF_ONMOUUIDS_PARAM
  })

  lambda_function_name = "statsHistory"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:Scan"]
      Resource = ["${local.dynamo_prefix}/${var.AUTH_HASHES_TABLE}"]
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

  environment_variables = merge(local.shared_environment, {
    DOWNLOAD_APP_REDIRECT_URL_CONFIG = var.DOWNLOAD_APP_REDIRECT_URL_CONFIG
  })

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

  environment_variables = merge(local.shared_environment, {
    AUTH_TRANSACTIONS_TABLE = var.AUTH_TRANSACTIONS_TABLE,
    API_VERSION             = local.api_version,
  })

  lambda_function_name = "email-change-initiate"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect  = "Allow",
      Actions = ["dynamodb:Query"],
      Resource = [
        "${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}",
        "${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}",
        "${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}/index/*"
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:UpdateItem"],
      Resource = ["${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}"]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:PutItem"],
      Resource = ["${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}"]
    },
    {
      Effect   = "Allow",
      Actions  = ["secretsmanager:GetSecretValue"],
      Resource = ["${local.secret_prefix}:sendgrid_prod*"]
    },
    {
      Effect   = "Allow",
      Actions  = ["ssm:GetParameter"],
      Resource = ["${local.param_prefix}${var.RATE_LIMITING_PARAM}"]
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

  environment_variables = merge(local.shared_environment, {
    AUTH_TRANSACTIONS_TABLE = var.AUTH_TRANSACTIONS_TABLE,
  })

  lambda_function_name = "email-change-redirect"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect  = "Allow",
      Actions = ["dynamodb:Query"],
      Resource = [
        "${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}",
        "${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}",
        "${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}/index/*"
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:PutItem"],
      Resource = ["${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}"]
    },
    {
      Effect   = "Allow",
      Actions  = ["ssm:GetParameter"],
      Resource = ["${local.param_prefix}${var.RATE_LIMITING_PARAM}"]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:UpdateItem"],
      Resource = ["${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}"]
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

  environment_variables = merge(local.shared_environment, {
    AUTH_TRANSACTIONS_TABLE = var.AUTH_TRANSACTIONS_TABLE,
  })

  lambda_function_name = "email-change-validate"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect  = "Allow",
      Actions = ["dynamodb:Query"],
      Resource = [
        "${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}",
        "${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}",
        "${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}/index/*"
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:UpdateItem"],
      Resource = ["${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}"]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:PutItem"],
      Resource = ["${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}"]
    },
    {
      Effect   = "Allow",
      Actions  = ["ssm:GetParameter"],
      Resource = ["${local.param_prefix}${var.RATE_LIMITING_PARAM}"]
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

  environment_variables = merge(local.shared_environment, {
    AUTH_TRANSACTIONS_TABLE = var.AUTH_TRANSACTIONS_TABLE,
    USER_TABLE              = var.USER_TABLE
  })

  lambda_function_name = "email-change-email-resend"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect  = "Allow",
      Actions = ["dynamodb:Query"],
      Resource = [
        "${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}",
        "${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}",
        "${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}/index/*"
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:UpdateItem"],
      Resource = ["${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}"]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:PutItem"],
      Resource = ["${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}"]
    },
    {
      Effect   = "Allow",
      Actions  = ["ssm:GetParameter"],
      Resource = ["${local.param_prefix}${var.RATE_LIMITING_PARAM}"]
    },
    {
      Effect   = "Allow",
      Actions  = ["secretsmanager:GetSecretValue"],
      Resource = ["${local.secret_prefix}:sendgrid_prod*"]
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

  environment_variables = merge(local.shared_environment, {
    AUTH_TRANSACTIONS_TABLE          = var.AUTH_TRANSACTIONS_TABLE,
    PINPOINT_PROJECT_ID              = var.PINPOINT_PROJECT_ID,
    API_VERSION                      = local.api_version,
    NOTIFICATIONS_SFMC_SECRET_NAME   = var.NOTIFICATIONS_SFMC_SECRET_NAME,
    NOTIFICATIONS_SFMC_TOKEN_URL     = var.NOTIFICATIONS_SFMC_TOKEN_URL,
    NOTIFICATIONS_SFMC_COMMS_URL     = var.NOTIFICATIONS_SFMC_COMMS_URL,
    NOTIFICATIONS_SFMC_GRANT_TYPE    = var.NOTIFICATIONS_SFMC_GRANT_TYPE,
    NOTIFICATIONS_SFMC_CLIENT_ID     = var.NOTIFICATIONS_SFMC_CLIENT_ID,
    NOTIFICATIONS_SFMC_ACCOUNT_ID    = var.NOTIFICATIONS_SFMC_ACCOUNT_ID,
    NOTIFICATIONS_SFMC_EVENT_KEY_OTP = var.NOTIFICATIONS_SFMC_EVENT_KEY_OTP
  })

  lambda_function_name = "phone-change-initiate"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect  = "Allow",
      Actions = ["dynamodb:Query"],
      Resource = [
        "${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}",
        "${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}",
        "${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}/index/*"
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:UpdateItem"],
      Resource = ["${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}"]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:PutItem"],
      Resource = ["${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}"]
    },
    {
      Effect   = "Allow",
      Actions  = ["ssm:GetParameter"],
      Resource = ["${local.param_prefix}${var.RATE_LIMITING_PARAM}"]
    },
    {
      Effect  = "Allow",
      Actions = ["mobiletargeting:SendMessages"],
      Resource = ["${local.mobile_prefix}:apps/${var.PINPOINT_PROJECT_ID}/messages",
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["mobiletargeting:UpdateEndpoint"]
      Resource = ["${local.mobile_prefix}:apps/${var.PINPOINT_PROJECT_ID}/endpoints/*"]
    },
    {
      Effect   = "Allow",
      Actions  = ["mobiletargeting:PhoneNumberValidate"],
      Resource = ["${local.mobile_prefix}:phone/number/validate"]
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
        "${local.secret_prefix}:salesforce-marketing-cloud-${var.ENVIRONMENT}*",
        "${local.secret_prefix}:events!connection/onmo-sales-force-api-connection-${var.ENVIRONMENT}*",
        "${local.secret_prefix}:onmo-posthog-${var.ENVIRONMENT}*",
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

  environment_variables = merge(local.shared_environment, {
    AUTH_TRANSACTIONS_TABLE = var.AUTH_TRANSACTIONS_TABLE,
    USER_TABLE              = var.USER_TABLE,
  })

  lambda_function_name = "phone-change-validate-otp"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect  = "Allow",
      Actions = ["dynamodb:Query"],
      Resource = [
        "${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}",
        "${local.dynamo_prefix}/${var.USER_TABLE}",
        "${local.dynamo_prefix}/${var.USER_TABLE}/index/*",
        "${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}",
        "${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}/index/*"
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:UpdateItem", "dynamodb:DeleteItem"],
      Resource = ["${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}"]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:PutItem"],
      Resource = ["${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}"]
    },
    {
      Effect   = "Allow",
      Actions  = ["ssm:GetParameter"],
      Resource = ["${local.param_prefix}${var.RATE_LIMITING_PARAM}"]
    },
    {
      Effect  = "Allow",
      Actions = ["secretsmanager:GetSecretValue"],
      Resource = [
        "${local.secret_prefix}:onmo-mambu-*",
        "${local.secret_prefix}:onmo-posthog-${var.ENVIRONMENT}*"
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

  environment_variables = merge(local.shared_environment, {
    AUTH_TRANSACTIONS_TABLE = var.AUTH_TRANSACTIONS_TABLE,
    FRONTEND_URL            = var.FRONTEND_URL,
  })

  lambda_function_name = "phone-change-email-send"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect  = "Allow",
      Actions = ["dynamodb:Query"],
      Resource = [
        "${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}",
        "${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}",
        "${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}/index/*"
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:UpdateItem"],
      Resource = ["${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}"]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:PutItem"],
      Resource = ["${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}"]
    },
    {
      Effect   = "Allow",
      Actions  = ["ssm:GetParameter"],
      Resource = ["${local.param_prefix}${var.RATE_LIMITING_PARAM}"]
    },
    {
      Effect   = "Allow",
      Actions  = ["secretsmanager:GetSecretValue"],
      Resource = ["${local.secret_prefix}:sendgrid_prod*"]
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

  environment_variables = merge(local.shared_environment, {
    AUTH_TRANSACTIONS_TABLE = var.AUTH_TRANSACTIONS_TABLE,
  })

  lambda_function_name = "phone-change-email-verify"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect  = "Allow",
      Actions = ["dynamodb:Query"],
      Resource = [
        "${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}",
        "${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}",
        "${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}/index/*"
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:UpdateItem"],
      Resource = ["${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}"]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:PutItem"],
      Resource = ["${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}"]
    },
    {
      Effect   = "Allow",
      Actions  = ["ssm:GetParameter"],
      Resource = ["${local.param_prefix}${var.RATE_LIMITING_PARAM}"]
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

  environment_variables = merge(local.shared_environment, {
    AUTH_TRANSACTIONS_TABLE = var.AUTH_TRANSACTIONS_TABLE,
  })

  lambda_function_name = "phone-change-email-redirect"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect  = "Allow",
      Actions = ["dynamodb:Query", "dynamodb:UpdateItem"],
      Resource = [
        "${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}",
        "${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}",
        "${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}/index/*"
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:PutItem"],
      Resource = ["${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}"]
    },
    {
      Effect   = "Allow",
      Actions  = ["ssm:GetParameter"],
      Resource = ["${local.param_prefix}${var.RATE_LIMITING_PARAM}"]
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

  environment_variables = merge(local.shared_environment, {
    AUTH_TRANSACTIONS_TABLE = var.AUTH_TRANSACTIONS_TABLE,
  })

  lambda_function_name = "phone-change-email-resend"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect  = "Allow",
      Actions = ["dynamodb:Query"],
      Resource = [
        "${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}",
        "${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}",
        "${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}/index/*"
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:UpdateItem"],
      Resource = ["${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}"]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:PutItem"],
      Resource = ["${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}"]
    },
    {
      Effect   = "Allow",
      Actions  = ["ssm:GetParameter"],
      Resource = ["${local.param_prefix}${var.RATE_LIMITING_PARAM}"]
    },
    {
      Effect   = "Allow",
      Actions  = ["secretsmanager:GetSecretValue"],
      Resource = ["${local.secret_prefix}:sendgrid_prod*"]
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

  environment_variables = merge(local.shared_environment, {
    AUTH_TRANSACTIONS_TABLE          = var.AUTH_TRANSACTIONS_TABLE,
    PINPOINT_PROJECT_ID              = var.PINPOINT_PROJECT_ID,
    NOTIFICATIONS_SFMC_SECRET_NAME   = var.NOTIFICATIONS_SFMC_SECRET_NAME,
    NOTIFICATIONS_SFMC_TOKEN_URL     = var.NOTIFICATIONS_SFMC_TOKEN_URL,
    NOTIFICATIONS_SFMC_COMMS_URL     = var.NOTIFICATIONS_SFMC_COMMS_URL,
    NOTIFICATIONS_SFMC_GRANT_TYPE    = var.NOTIFICATIONS_SFMC_GRANT_TYPE,
    NOTIFICATIONS_SFMC_CLIENT_ID     = var.NOTIFICATIONS_SFMC_CLIENT_ID,
    NOTIFICATIONS_SFMC_ACCOUNT_ID    = var.NOTIFICATIONS_SFMC_ACCOUNT_ID,
    NOTIFICATIONS_SFMC_EVENT_KEY_OTP = var.NOTIFICATIONS_SFMC_EVENT_KEY_OTP
  })

  lambda_function_name = "phone-change-otp-resend"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect  = "Allow",
      Actions = ["dynamodb:Query"],
      Resource = [
        "${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}",
        "${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}",
        "${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}/index/*"
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:UpdateItem"],
      Resource = ["${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}"]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:PutItem"],
      Resource = ["${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}"]
    },
    {
      Effect   = "Allow",
      Actions  = ["ssm:GetParameter"],
      Resource = ["${local.param_prefix}${var.RATE_LIMITING_PARAM}"]
    },
    {
      Effect  = "Allow",
      Actions = ["mobiletargeting:SendMessages"],
      Resource = ["${local.mobile_prefix}:apps/${var.PINPOINT_PROJECT_ID}/messages",
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["mobiletargeting:UpdateEndpoint"]
      Resource = ["${local.mobile_prefix}:apps/${var.PINPOINT_PROJECT_ID}/endpoints/*"]
    },
    {
      Effect   = "Allow",
      Actions  = ["mobiletargeting:PhoneNumberValidate"],
      Resource = ["${local.mobile_prefix}:phone/number/validate"]
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
        "${local.secret_prefix}:salesforce-marketing-cloud-${var.ENVIRONMENT}*",
        "${local.secret_prefix}:events!connection/onmo-sales-force-api-connection-${var.ENVIRONMENT}*",
        "${local.secret_prefix}:onmo-posthog-${var.ENVIRONMENT}*",
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

  environment_variables = merge(local.shared_environment, {
    AUTH_TRANSACTIONS_TABLE          = var.AUTH_TRANSACTIONS_TABLE,
    PINPOINT_PROJECT_ID              = var.PINPOINT_PROJECT_ID,
    NOTIFICATIONS_SFMC_SECRET_NAME   = var.NOTIFICATIONS_SFMC_SECRET_NAME,
    NOTIFICATIONS_SFMC_TOKEN_URL     = var.NOTIFICATIONS_SFMC_TOKEN_URL,
    NOTIFICATIONS_SFMC_COMMS_URL     = var.NOTIFICATIONS_SFMC_COMMS_URL,
    NOTIFICATIONS_SFMC_GRANT_TYPE    = var.NOTIFICATIONS_SFMC_GRANT_TYPE,
    NOTIFICATIONS_SFMC_CLIENT_ID     = var.NOTIFICATIONS_SFMC_CLIENT_ID,
    NOTIFICATIONS_SFMC_ACCOUNT_ID    = var.NOTIFICATIONS_SFMC_ACCOUNT_ID,
    NOTIFICATIONS_SFMC_EVENT_KEY_OTP = var.NOTIFICATIONS_SFMC_EVENT_KEY_OTP
  })

  lambda_function_name = "email-change-otp-resend"

  execution_from = [{ service = "APIGateway", source_arn = module.rest_api_gateway.execution_arn }]
  permission_statements = [
    {
      Effect  = "Allow",
      Actions = ["dynamodb:Query"],
      Resource = [
        "${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}",
        "${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}",
        "${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}/index/*"
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:UpdateItem"],
      Resource = ["${local.dynamo_prefix}/${var.AUTH_TRANSACTIONS_TABLE}"]
    },
    {
      Effect   = "Allow",
      Actions  = ["dynamodb:PutItem"],
      Resource = ["${local.dynamo_prefix}/${var.RATE_LIMITING_TABLE}"]
    },
    {
      Effect   = "Allow",
      Actions  = ["ssm:GetParameter"],
      Resource = ["${local.param_prefix}${var.RATE_LIMITING_PARAM}"]
    },
    {
      Effect  = "Allow",
      Actions = ["mobiletargeting:SendMessages"],
      Resource = ["${local.mobile_prefix}:apps/${var.PINPOINT_PROJECT_ID}/messages",
      ]
    },
    {
      Effect   = "Allow",
      Actions  = ["mobiletargeting:UpdateEndpoint"]
      Resource = ["${local.mobile_prefix}:apps/${var.PINPOINT_PROJECT_ID}/endpoints/*"]
    },
    {
      Effect   = "Allow",
      Actions  = ["mobiletargeting:PhoneNumberValidate"],
      Resource = ["${local.mobile_prefix}:phone/number/validate"]
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
        "${local.secret_prefix}:salesforce-marketing-cloud-${var.ENVIRONMENT}*",
        "${local.secret_prefix}:events!connection/onmo-sales-force-api-connection-${var.ENVIRONMENT}*",
        "${local.secret_prefix}:onmo-posthog-${var.ENVIRONMENT}*",
      ]
    }
  ]
  memory_size = 2048
  timeout     = 30
}
