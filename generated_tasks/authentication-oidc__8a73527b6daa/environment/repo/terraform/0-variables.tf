# .github/workflows/${ENVIRONMENT}.deploy.yaml

locals {
  service_config = {
    service_name   = var.SERVICE_NAME
    environment    = var.ENVIRONMENT
    region         = var.REGION
    aws_account_id = var.AWS_ACCOUNT_ID
  }

  gateway_config = {
    disable_default_endpoint = var.DISABLE_DEFAULT_ENDPOINT,
    custom_domain_names      = var.CUSTOM_DOMAIN_NAMES
    web_acl_arn              = var.WEB_ACL_ARN
    throttling_burst_limit   = var.THROTTLING_BURST_LIMIT
    throttling_rate_limit    = var.THROTTLING_RATE_LIMIT
    base_path                = var.BASE_PATH
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

  auth_scopes = merge(
    {
      APR_SCOPE                    = var.APR_SCOPE,
      CLM_SCOPE                    = var.CLM_SCOPE,
      CUSTOMER_CARE_SCOPE          = var.CUSTOMER_CARE_SCOPE,
      LOAN_ACCOUNT_ID_SCOPE        = var.LOAN_ACCOUNT_ID_SCOPE, # TODO: deprecate when not in use & replaced with credit-card-account-id
      CREDIT_CARD_ACCOUNT_ID_SCOPE = var.CREDIT_CARD_ACCOUNT_ID_SCOPE,
      CREDIT_CARD_ID_SCOPE         = var.CREDIT_CARD_ID_SCOPE,
      CUSTOMER_PROFILE_SCOPE       = var.CUSTOMER_PROFILE_SCOPE,
      SUPPORT_SERVICES_SCOPE       = var.SUPPORT_SERVICES_SCOPE,
      AUTH_SERVICES_SCOPE          = var.AUTH_SERVICES_SCOPE,
      CREDIT_CARD_ACCOUNT_SCOPE    = var.CREDIT_CARD_ACCOUNT_SCOPE,
      DIRECT_DEBIT_SCOPE           = var.DIRECT_DEBIT_SCOPE,
      DEBIT_CARD_ACCOUNT_SCOPE     = var.DEBIT_CARD_ACCOUNT_SCOPE,
      CREDIT_CARD_DETAILS_SCOPE    = var.CREDIT_CARD_DETAILS_SCOPE,
      CREDIT_CARD_ACTIVATION_SCOPE = var.CREDIT_CARD_ACTIVATION_SCOPE,
      CREDIT_CARD_FREEZE_SCOPE     = var.CREDIT_CARD_FREEZE_SCOPE,
      CREDIT_CARD_UNFREEZE_SCOPE   = var.CREDIT_CARD_UNFREEZE_SCOPE,
      NAME_CHANGE_SCOPE            = var.NAME_CHANGE_SCOPE,
      EMAIL_ADDRESS_CHANGE_SCOPE   = var.EMAIL_ADDRESS_CHANGE_SCOPE,
      MOBILE_NUMBER_CHANGE_SCOPE   = var.MOBILE_NUMBER_CHANGE_SCOPE,
      ADDRESS_CHANGE_SCOPE         = var.ADDRESS_CHANGE_SCOPE,
      BIOMETRICS_CHANGE_SCOPE      = var.BIOMETRICS_CHANGE_SCOPE,
      PASSCODE_CHANGE_SCOPE        = var.PASSCODE_CHANGE_SCOPE,
      REPAYMENT_SCOPE              = var.REPAYMENT_SCOPE,
      FIRST_TIME_LOGIN_SCOPE       = var.FIRST_TIME_LOGIN_SCOPE
    },
    var.ENVIRONMENT == "prod" ? {} : {
      TEST_OTP_STEP_EXTRA_SCOPE        = var.TEST_OTP_STEP_EXTRA_SCOPE,
      TEST_BIOMETRICS_STEP_EXTRA_SCOPE = var.TEST_BIOMETRICS_STEP_EXTRA_SCOPE
    }
  )

  posthog = {
    POSTHOG_HAL_FLAG_KEY          = var.POSTHOG_HAL_FLAG_KEY
    POSTHOG_SECRET_NAME           = var.POSTHOG_SECRET_NAME,
    POSTHOG_SECRET_ARN            = var.POSTHOG_SECRET_ARN,
    POSTHOG_NOTIFICATION_FLAG_KEY = var.POSTHOG_NOTIFICATION_FLAG_KEY
  }

  shared_environment = merge(local.auth_scopes, local.posthog, {
    ENVIRONMENT    = var.ENVIRONMENT
    REGION         = var.REGION
    AWS_ACCOUNT_ID = var.AWS_ACCOUNT_ID
    STAGE          = var.ENVIRONMENT
    LOGGING_LEVEL  = var.LOGGING_LEVEL

  })
}


# SERVICE CONFIG

variable "SERVICE_NAME" {
  type = string
}
variable "ENVIRONMENT" {
  type = string
}
variable "REGION" {
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
variable "GITHUB_REPO" {
  type = string
}
variable "SLACK_CHANNEL" {
  type = string
}

variable "ALERT_EMAIL_LIST" {
  type = list(string)
}


# GATEWAY CONFIG 

variable "DISABLE_DEFAULT_ENDPOINT" {
  type = bool
}
variable "CUSTOM_DOMAIN_NAMES" {
  type = list(string)
}
variable "WEB_ACL_ARN" {
  type = string
}
variable "THROTTLING_BURST_LIMIT" {
  type = number
}
variable "THROTTLING_RATE_LIMIT" {
  type = number
}
variable "BASE_PATH" {
  type = string
}


# LAMBDA ENVIRONMENT VARIABLES

variable "AUTH_TRANSACTIONS_TABLE" {
  type = string
}
variable "AUTH_CODES_TABLE" {
  type = string
}
variable "AUTH_TOKENS_TABLE" {
  type = string
}
variable "AUTH_REFRESH_TOKENS_TABLE" {
  type = string
}
variable "AUTH_HASHES_TABLE" {
  type = string
}
variable "AUTH_KEYS_TABLE" {
  type = string
}
variable "USER_TABLE" {
  type = string
}
variable "LEGACY_AUTH_TABLE" {
  type = string
}
variable "LEGACY_RSA_TABLE" {
  type = string
}
variable "LEGACY_AUTH_BACKUP_TABLE" {
  type = string
}
variable "LEGACY_RSA_BACKUP_TABLE" {
  type = string
}
variable "APR_INCREASES_TABLE" {
  type = string
}
variable "CUSTOMER_TO_CARD_MAPPING_TABLE" {
  type = string
}
variable "RATE_LIMITING_TABLE" {
  type = string
}
variable "PINPOINT_PROJECT_ID" {
  type = string
}
variable "ONMO_AUTH_URL" {
  type = string
}
variable "ONMO_API_URL" {
  type = string
}
variable "FRONTEND_URL" {
  type = string
}
variable "APR_GATEWAY_ID" {
  type = string
}
variable "CUSTOMER_CARE_GATEWAY_ID" {
  type = string
}
variable "API_BROKER_GATEWAY_ID" {
  type = string
}
variable "AUTHENTICATION_GATEWAY_ID" {
  type = string
}
variable "CARD_SERVICE_OIDC_GATEWAY_ID" {
  type = string
}
variable "ACCOUNT_SERVICE_OIDC_GATEWAY_ID" {
  type = string
}
variable "CUSTOMER_SERVICE_OIDC_GATEWAY_ID" {
  type = string
}
variable "REPAYMENT_SERVICE_GATEWAY_ID" {
  type = string
}
variable "ALERT_SERVICE_OIDC_GATEWAY_ID" {
  type = string
}
variable "TRANSACTION_SERVICE_OIDC_GATEWAY_ID" {
  type = string
}
variable "DEVICE_CHANNEL_GATEWAY_ID" {
  type = string
}
variable "LOGGING_LEVEL" {
  type = string
}
variable "NON_CONFLICTING_SCOPES_PARAM" {
  type = string
}
variable "EXCLUSIVE_SCOPES_PARAM" {
  type = string
}
variable "AUTH_FLOW_SCOPES_PARAM" {
  type = string
}
variable "SCOPE_TO_RESOURCE_MAP_PARAM" {
  type = string
}
variable "SCOPE_TO_RESOURCE_MAP_URL_PARAM" {
  type = string
}
variable "TOKEN_LIFETIMES_PARAM" {
  type = string
}
variable "STAFF_ONMOUUIDS_PARAM" {
  type = string
}
variable "APP_TESTER_LOGIN_CONFIG" {
  type = string
}
variable "RATE_LIMITING_PARAM" {
  type = string
}
variable "QA_BYPASS_CUSTOMER_IDS" {
  type    = string
  default = ""
}
variable "DOWNLOAD_APP_REDIRECT_URL_CONFIG" {
  type = string
}


# AUTH SCOPES

variable "APR_SCOPE" {
  type = string
}
variable "CLM_SCOPE" {
  type = string
}
variable "CUSTOMER_CARE_SCOPE" {
  type = string
}
variable "LOAN_ACCOUNT_ID_SCOPE" { # TODO: deprecate when not in use & replaced with credit-card-account-id
  type = string
}
variable "CREDIT_CARD_ACCOUNT_ID_SCOPE" {
  type = string
}
variable "CREDIT_CARD_ID_SCOPE" {
  type = string
}
variable "CUSTOMER_PROFILE_SCOPE" {
  type = string
}
variable "SUPPORT_SERVICES_SCOPE" {
  type = string
}
variable "AUTH_SERVICES_SCOPE" {
  type = string
}
variable "CREDIT_CARD_ACCOUNT_SCOPE" {
  type = string
}
variable "DIRECT_DEBIT_SCOPE" {
  type = string
}
variable "DEBIT_CARD_ACCOUNT_SCOPE" {
  type = string
}
variable "CREDIT_CARD_DETAILS_SCOPE" {
  type = string
}
variable "CREDIT_CARD_ACTIVATION_SCOPE" {
  type = string
}
variable "CREDIT_CARD_FREEZE_SCOPE" {
  type = string
}
variable "CREDIT_CARD_UNFREEZE_SCOPE" {
  type = string
}
variable "NAME_CHANGE_SCOPE" {
  type = string
}
variable "EMAIL_ADDRESS_CHANGE_SCOPE" {
  type = string
}
variable "MOBILE_NUMBER_CHANGE_SCOPE" {
  type = string
}
variable "ADDRESS_CHANGE_SCOPE" {
  type = string
}
variable "BIOMETRICS_CHANGE_SCOPE" {
  type = string
}
variable "PASSCODE_CHANGE_SCOPE" {
  type = string
}
variable "REPAYMENT_SCOPE" {
  type = string
}
variable "FIRST_TIME_LOGIN_SCOPE" {
  type = string
}

# test scopes
variable "TEST_OTP_STEP_EXTRA_SCOPE" {
  type = string
}

variable "TEST_BIOMETRICS_STEP_EXTRA_SCOPE" {
  type = string
}

variable "NOTIFICATIONS_SFMC_SECRET_NAME" {
  type = string
}

variable "NOTIFICATIONS_SFMC_TOKEN_URL" {
  type = string
}

variable "NOTIFICATIONS_SFMC_COMMS_URL" {
  type = string
}

variable "NOTIFICATIONS_SFMC_GRANT_TYPE" {
  type = string
}

variable "NOTIFICATIONS_SFMC_CLIENT_ID" {
  type = string
}

variable "NOTIFICATIONS_SFMC_ACCOUNT_ID" {
  type = string
}

variable "NOTIFICATIONS_SFMC_EVENT_KEY_OTP" {
  type = string
}

variable "POSTHOG_SECRET_NAME" {
  type = string
}

variable "POSTHOG_NOTIFICATION_FLAG_KEY" {
  type = string
}

variable "POSTHOG_HAL_FLAG_KEY" {
  type = string
}

variable "POSTHOG_SECRET_ARN" {
  type = string
}
