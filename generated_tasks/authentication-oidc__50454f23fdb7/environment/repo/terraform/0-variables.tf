# .github/workflows/${ENVIRONMENT}.deploy.yaml

locals {
  # ── YAML Config ──────────────────────────────────────────────────────────────
  common_config = yamldecode(file("${path.root}/../config/common.yaml"))
  env_config    = yamldecode(file("${path.root}/../config/${var.ENVIRONMENT}.yaml"))

  service_config = {
    service_name   = local.common_config.service.SERVICE_NAME
    environment    = var.ENVIRONMENT
    region         = local.common_config.service.REGION
    aws_account_id = var.AWS_ACCOUNT_ID
  }

  gateway_config = {
    disable_default_endpoint = local.common_config.service.DISABLE_DEFAULT_ENDPOINT
    custom_domain_names      = local.env_config.gateway_config.CUSTOM_DOMAIN_NAMES
    web_acl_arn              = var.WEB_ACL_ARN
    throttling_burst_limit   = local.env_config.gateway_config.THROTTLING_BURST_LIMIT
    throttling_rate_limit    = local.env_config.gateway_config.THROTTLING_RATE_LIMIT
    base_path                = local.common_config.service.BASE_PATH
  }

  paymentology_vpc_config = {
    subnet_ids         = split(",", data.aws_ssm_parameter.pty_subnets.value)
    security_group_ids = split(",", data.aws_ssm_parameter.pty_security_groups.value)
  }

  shared_lambda_config = {}
  general_lambda_config = {
    source_dir = "${path.root}/../build/general"
  }
  otp_lambda_config = {
    source_dir = "${path.root}/../build/otp"
  }
  otp_passcode_lambda_config = {
    source_dir = "${path.root}/../build/otp-passcode"
  }
  biometrics_lambda_config = {
    source_dir = "${path.root}/../build/biometrics"
  }
  extra_scope_lambda_config = {
    source_dir = "${path.root}/../build/extra-scope"
  }
  forgotten_passcode_lambda_config = {
    source_dir = "${path.root}/../build/forgotten-passcode"
  }
  email_change_lambda_config = {
    source_dir = "${path.root}/../build/email-change"
  }
  phone_change_lambda_config = {
    source_dir = "${path.root}/../build/phone-change"
  }
  other_lambda_config = {
    source_dir = "${path.root}/../build/other"
  }

  # ── Auth scopes ────────────────────────────────────────────────────────────
  auth_scopes = merge(
    local.common_config.scopes,
    var.ENVIRONMENT == "prod" ? {} : local.env_config.test_scopes,
  )

  posthog = {
    POSTHOG_HAL_FLAG_KEY          = local.common_config.posthog.POSTHOG_HAL_FLAG_KEY
    POSTHOG_SECRET_NAME           = local.POSTHOG_SECRET_NAME
    POSTHOG_SECRET_ARN            = local.POSTHOG_SECRET_ARN
    POSTHOG_NOTIFICATION_FLAG_KEY = local.common_config.posthog.POSTHOG_NOTIFICATION_FLAG_KEY
  }

  shared_environment = merge(local.auth_scopes, local.posthog, {
    ENVIRONMENT     = var.ENVIRONMENT
    REGION          = local.common_config.service.REGION
    AWS_ACCOUNT_ID  = var.AWS_ACCOUNT_ID
    STAGE           = var.ENVIRONMENT
    LOGGING_LEVEL   = local.env_config.logging_level
    DD_ENV          = var.ENVIRONMENT
    DD_VERSION      = var.RELEASE_VERSION
    RELEASE_VERSION = var.RELEASE_VERSION
  })

  # ── Derived maps ───────────────────────────────────────────────────────────
  # One `for` expression per derivation pattern — no per-key repetition.

  derived_tables = {
    for k, v in local.common_config.tables : k => "${v}-${var.ENVIRONMENT}"
  }
  derived_params = {
    for k, v in local.common_config.params : k => "/onmo/auth/${var.ENVIRONMENT}/${v}"
  }
  derived_secrets = {
    for k, v in local.common_config.secrets : k => "${v}-${var.ENVIRONMENT}"
  }

  # ── Individual derived value aliases ───────────────────────────────────────
  # Referenced by IAM statements in 2-functions.tf and SSM resources in 6-parameters.tf.

  AUTH_TRANSACTIONS_TABLE   = local.derived_tables.AUTH_TRANSACTIONS_TABLE
  AUTH_CODES_TABLE          = local.derived_tables.AUTH_CODES_TABLE
  AUTH_TOKENS_TABLE         = local.derived_tables.AUTH_TOKENS_TABLE
  AUTH_REFRESH_TOKENS_TABLE = local.derived_tables.AUTH_REFRESH_TOKENS_TABLE
  AUTH_HASHES_TABLE         = local.derived_tables.AUTH_HASHES_TABLE
  AUTH_KEYS_TABLE           = local.derived_tables.AUTH_KEYS_TABLE
  USER_TABLE                = local.derived_tables.USER_TABLE
  LEGACY_AUTH_TABLE         = local.derived_tables.LEGACY_AUTH_TABLE
  LEGACY_RSA_TABLE          = local.derived_tables.LEGACY_RSA_TABLE
  LEGACY_AUTH_BACKUP_TABLE  = local.derived_tables.LEGACY_AUTH_BACKUP_TABLE
  LEGACY_RSA_BACKUP_TABLE   = local.derived_tables.LEGACY_RSA_BACKUP_TABLE
  APR_INCREASES_TABLE       = local.derived_tables.APR_INCREASES_TABLE
  RATE_LIMITING_TABLE       = local.derived_tables.RATE_LIMITING_TABLE

  NON_CONFLICTING_SCOPES_PARAM    = local.derived_params.NON_CONFLICTING_SCOPES_PARAM
  EXCLUSIVE_SCOPES_PARAM          = local.derived_params.EXCLUSIVE_SCOPES_PARAM
  AUTH_FLOW_SCOPES_PARAM          = local.derived_params.AUTH_FLOW_SCOPES_PARAM
  SCOPE_TO_RESOURCE_MAP_PARAM     = local.derived_params.SCOPE_TO_RESOURCE_MAP_PARAM
  SCOPE_TO_RESOURCE_MAP_URL_PARAM = local.derived_params.SCOPE_TO_RESOURCE_MAP_URL_PARAM
  TOKEN_LIFETIMES_PARAM           = local.derived_params.TOKEN_LIFETIMES_PARAM
  STAFF_ONMOUUIDS_PARAM           = local.derived_params.STAFF_ONMOUUIDS_PARAM
  APP_TESTER_LOGIN_CONFIG         = local.derived_params.APP_TESTER_LOGIN_CONFIG

  NOTIFICATIONS_SFMC_SECRET_NAME = local.derived_secrets.NOTIFICATIONS_SFMC_SECRET_NAME
  CARD_SERVICE_SECRET_NAME       = local.derived_secrets.CARD_SERVICE_SECRET_NAME
  POSTHOG_SECRET_NAME            = local.derived_secrets.POSTHOG_SECRET_NAME
  POSTHOG_SECRET_ARN             = local.derived_secrets.POSTHOG_SECRET_ARN

  # ── Lambda env var groups ──────────────────────────────────────────────────
  # Composable maps merged into each Lambda function's environment_variables.
  # Adding a new value to config YAML automatically flows through — no manual key listing.

  env_tables = local.derived_tables

  env_gateways = merge(
    local.common_config.gateways,
    local.env_config.gateways,
    {
      ONMO_AUTH_URL = local.env_config.urls.ONMO_AUTH_URL
      ONMO_API_URL  = local.env_config.urls.ONMO_API_URL
    }
  )

  env_params = merge(
    local.derived_params,
    local.env_config.params,
  )

  env_sfmc = merge(local.common_config.sfmc, local.env_config.sfmc, {
    NOTIFICATIONS_SFMC_SECRET_NAME = local.NOTIFICATIONS_SFMC_SECRET_NAME
    PINPOINT_PROJECT_ID            = var.PINPOINT_PROJECT_ID
  })

  env_card = {
    CARD_SERVICE_SECRET_NAME = local.CARD_SERVICE_SECRET_NAME
    CARD_SERVICE_BASE_URL    = local.env_config.urls.CARD_SERVICE_BASE_URL
  }

  env_misc = {
    QA_BYPASS_CUSTOMER_IDS = local.env_config.misc.QA_BYPASS_CUSTOMER_IDS
    FRONTEND_URL           = local.env_config.urls.FRONTEND_URL
  }

}


# ── Variables (secrets & dynamic values only) ────────────────────────────────
# Everything else comes from config/common.yaml and config/{environment}.yaml.

variable "ENVIRONMENT" {
  type = string
}

variable "AWS_ACCOUNT_ID" {
  type = string
}

variable "DATADOG_API_KEY" {
  type = string
}

variable "DATADOG_APP_KEY" {
  type = string
}

variable "AUTH_FLOW_SUCCESS_RATE_CRITICAL" {
  type        = number
  default     = 0.85
  description = "Critical threshold for auth flow success rate monitors (completed/started ratio)"
}

variable "AUTH_FLOW_SUCCESS_RATE_WARNING" {
  type        = number
  default     = 0.90
  description = "Warning threshold for auth flow success rate monitors (completed/started ratio)"
}

variable "AUTH_FLOW_MIN_SAMPLE_SIZE" {
  type        = number
  default     = 20
  description = "Minimum number of started requests in the evaluation window before monitors evaluate"
}

variable "STALE_TRANSACTION_THRESHOLD" {
  type        = number
  default     = 50
  description = "Critical threshold: number of transactions that started but didn't complete within 15m"
}

variable "STALE_TRANSACTION_WARNING_THRESHOLD" {
  type        = number
  default     = 25
  description = "Warning threshold: number of transactions that started but didn't complete within 15m"
}

variable "WEB_ACL_ARN" {
  type = string
}

variable "PINPOINT_PROJECT_ID" {
  type = string
}

variable "GITHUB_REPO" {
  type = string
}

variable "RELEASE_VERSION" {
  type    = string
  default = "local"
}

variable "PR_VERSIONS" {
  description = "Map of PR version name to minor version number, e.g. {\"pr-321\": 204883519}. Minor version is derived from head commit SHA to force alias updates on each deploy."
  type        = map(number)
  default     = {}
}
