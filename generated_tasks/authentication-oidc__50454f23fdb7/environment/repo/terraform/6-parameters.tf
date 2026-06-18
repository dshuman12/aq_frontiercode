locals {
  # -- otp scopes
  otp_scopes = [
    local.common_config.scopes.APR_SCOPE,
    local.common_config.scopes.CLM_SCOPE,
    local.common_config.scopes.CUSTOMER_CARE_SCOPE,
    local.common_config.scopes.LOAN_ACCOUNT_ID_SCOPE, # TODO: deprecate when not in use & replaced with credit-card-account-id
    local.common_config.scopes.CREDIT_CARD_ACCOUNT_ID_SCOPE,
    local.common_config.scopes.REPAYMENT_SCOPE,
    local.common_config.scopes.BIOMETRICS_CHECK_SCOPE
  ]
  # -- otp-passcode scopes
  otp_passcode_scopes = [
    local.common_config.scopes.CUSTOMER_PROFILE_SCOPE,
    local.common_config.scopes.SUPPORT_SERVICES_SCOPE,
    local.common_config.scopes.CREDIT_CARD_ACCOUNT_SCOPE,
    local.common_config.scopes.CREDIT_CARD_ACCOUNT_ID_SCOPE,
    local.common_config.scopes.CREDIT_CARD_ID_SCOPE,
    local.common_config.scopes.DIRECT_DEBIT_SCOPE,
    local.common_config.scopes.DEBIT_CARD_ACCOUNT_SCOPE,
    local.common_config.scopes.AUTH_SERVICES_SCOPE,
    local.common_config.scopes.REPAYMENT_SCOPE,
    local.common_config.scopes.BIOMETRICS_CHECK_SCOPE,
    local.common_config.scopes.FIRST_TIME_LOGIN_SCOPE # for resources that require an extra-scope, unless it's first time login
  ]
  # -- shared scopes -> scopes present in both otp_scopes and otp_passcode_scopes
  shared_scopes = setintersection(local.otp_scopes, local.otp_passcode_scopes)

  # -- extra-scope scopes
  extra_scopes = concat(
    [
      local.common_config.scopes.CREDIT_CARD_DETAILS_SCOPE,
      local.common_config.scopes.CREDIT_CARD_ACTIVATION_SCOPE,
      local.common_config.scopes.CREDIT_CARD_FREEZE_SCOPE,
      local.common_config.scopes.CREDIT_CARD_UNFREEZE_SCOPE,
      local.common_config.scopes.NAME_CHANGE_SCOPE,
      local.common_config.scopes.EMAIL_ADDRESS_CHANGE_SCOPE,
      local.common_config.scopes.MOBILE_NUMBER_CHANGE_SCOPE,
      local.common_config.scopes.ADDRESS_CHANGE_SCOPE,
      local.common_config.scopes.PASSCODE_CHANGE_SCOPE,
      local.common_config.scopes.BIOMETRICS_CHANGE_SCOPE,
    ],
    values(local.env_config.test_scopes)
  )
}

data "aws_ssm_parameter" "pty_subnets" {
  name = "/onmo/paymentology/service-layer/subnetIds/${var.ENVIRONMENT}"
}

data "aws_ssm_parameter" "pty_security_groups" {
  name = "/onmo/paymentology/service-layer/securityGroupIds/${var.ENVIRONMENT}"
}

resource "aws_ssm_parameter" "auth_flow_scopes" {
  name = local.AUTH_FLOW_SCOPES_PARAM
  type = "String"
  value = jsonencode({
    otp_scopes          = local.otp_scopes
    otp_passcode_scopes = local.otp_passcode_scopes
    extra_scopes        = local.extra_scopes
  })
}

# scope_to_resource_map is being replaced with scope_to_resource_url_map.
# This due to the ~8000 char limit of an SSM parameter value.
# Add you new resources to the scope_to_resource_url_map S3 object instead.
resource "aws_ssm_parameter" "scope_to_resource_map" { # Obsolete, add to 8-resources.tf
  name = local.SCOPE_TO_RESOURCE_MAP_PARAM
  tier = "Advanced"
  type = "String"
  value = jsonencode(merge(
    {
      (local.common_config.scopes.CLM_SCOPE) = [
        "{arn_prefix}:{api_broker_gateway_id}/{env}/GET/account/clm/*",
        "{arn_prefix}:{api_broker_gateway_id}/{env}/PUT/account/clm/*",
        "{arn_prefix}:{api_broker_gateway_id}/{env}/PUT/account/clm/*/limit-change",
        "{arn_prefix}:{api_broker_gateway_id}/{env}/GET/account/clm/*/offer-validity",
      ],
      (local.common_config.scopes.APR_SCOPE) = [
        "{arn_prefix}:{apr_gateway_id}/{env}/POST/*/opt-out/verify-otp",
        "{arn_prefix}:{apr_gateway_id}/{env}/GET/*",
        "{arn_prefix}:{apr_gateway_id}/{env}/GET/*/change",
        "{arn_prefix}:{apr_gateway_id}/{env}/GET/*/declined",
        "{arn_prefix}:{apr_gateway_id}/{env}/POST/*/opt-out/send-otp",
      ],
      (local.common_config.scopes.CUSTOMER_CARE_SCOPE) = [
        "{arn_prefix}:{customer_care_gateway_id}/*/GET/accounts/*/arrears",
        "{arn_prefix}:{customer_care_gateway_id}/*/GET/accounts/*/arrears/plan",
        "{arn_prefix}:{customer_care_gateway_id}/*/GET/accounts/*/arrears/financials",
        "{arn_prefix}:{customer_care_gateway_id}/*/GET/accounts/*/arrears/financials/budget",
        "{arn_prefix}:{customer_care_gateway_id}/*/GET/accounts/*/arrears/screens/initial",
        "{arn_prefix}:{customer_care_gateway_id}/*/PATCH/accounts/*/arrears",
        "{arn_prefix}:{customer_care_gateway_id}/*/PATCH/accounts/*/arrears/financials",
        "{arn_prefix}:{api_broker_gateway_id}/{env}/GET/repayment/card/customer-care",
      ],
      # /user-info scopes
      (local.common_config.scopes.LOAN_ACCOUNT_ID_SCOPE)        = ["{arn_prefix}:{authentication_gateway_id}/*/GET/user-info"],
      (local.common_config.scopes.CREDIT_CARD_ACCOUNT_ID_SCOPE) = ["{arn_prefix}:{authentication_gateway_id}/*/GET/user-info"],
      (local.common_config.scopes.CREDIT_CARD_ID_SCOPE)         = ["{arn_prefix}:{authentication_gateway_id}/*/GET/user-info"],
      (local.common_config.scopes.AUTH_SERVICES_SCOPE) = [
        "{arn_prefix}:{authentication_gateway_id}/*/POST/logout",
        "{arn_prefix}:{authentication_gateway_id}/*/POST/eligibility",
        "{arn_prefix}:{authentication_gateway_id}/*/POST/authorize/extra-scope",
        "{arn_prefix}:{authentication_gateway_id}/*/POST/*/extra-scope/otp/send",
        "{arn_prefix}:{authentication_gateway_id}/*/POST/*/extra-scope/otp/resend",
        "{arn_prefix}:{authentication_gateway_id}/*/POST/*/extra-scope/otp/verify",
        "{arn_prefix}:{authentication_gateway_id}/*/POST/*/extra-scope/passcode/verify",
        "{arn_prefix}:{authentication_gateway_id}/*/POST/*/extra-scope/biometrics/verify",
        "{arn_prefix}:{authentication_gateway_id}/*/POST/authorize/forgotten-passcode/logged-in",
        "{arn_prefix}:{authentication_gateway_id}/*/POST/*/email-change/initiate",
        "{arn_prefix}:{authentication_gateway_id}/*/GET/*/email-change/redirect",
        "{arn_prefix}:{authentication_gateway_id}/*/POST/*/email-change/email/resend",
        "{arn_prefix}:{authentication_gateway_id}/*/POST/*/email-change/validate",
        "{arn_prefix}:{authentication_gateway_id}/*/POST/*/email-change/otp/resend",
        "{arn_prefix}:{authentication_gateway_id}/*/POST/*/phone-change/initiate",
        "{arn_prefix}:{authentication_gateway_id}/*/POST/*/phone-change/otp/*",
        "{arn_prefix}:{authentication_gateway_id}/*/POST/*/phone-change/email/*",
        "{arn_prefix}:{authentication_gateway_id}/*/GET/*/phone-change/email/*",
      ],
      (local.common_config.scopes.CUSTOMER_PROFILE_SCOPE) = [
        "{arn_prefix}:{api_broker_gateway_id}/{env}/POST/account/editprofile",
        "{arn_prefix}:{api_broker_gateway_id}/{env}/POST/account/editprofile/verifyemail",
        "{arn_prefix}:{api_broker_gateway_id}/{env}/GET/passcode/email-validation-check",
        "{arn_prefix}:{api_broker_gateway_id}/{env}/POST/passcode/email-check",
        "{arn_prefix}:{api_broker_gateway_id}/{env}/GET/account/customer",
        "{arn_prefix}:{customer_service_oidc_gateway_id}/*/GET/*",
        "{arn_prefix}:{customer_service_oidc_gateway_id}/*/PATCH/*",
        "{arn_prefix}:{customer_service_oidc_gateway_id}/*/GET/*/communications-preferences",
        "{arn_prefix}:{customer_service_oidc_gateway_id}/*/PATCH/*/communications-preferences",
      ],
      (local.common_config.scopes.SUPPORT_SERVICES_SCOPE) = [
        "{arn_prefix}:{api_broker_gateway_id}/{env}/POST/mobile/store-token",
        "{arn_prefix}:{api_broker_gateway_id}/{env}/GET/account/postcodecheck",
      ],
      (local.common_config.scopes.CREDIT_CARD_ACCOUNT_SCOPE) = [
        "{arn_prefix}:{api_broker_gateway_id}/{env}/GET/account/statement",
        "{arn_prefix}:{api_broker_gateway_id}/{env}/POST/account/creditcard",
        "{arn_prefix}:{api_broker_gateway_id}/{env}/GET/account/bankingdetail/transaction",
        "{arn_prefix}:{api_broker_gateway_id}/{env}/GET/account/bankingdetail/loan-transaction",
        "{arn_prefix}:{api_broker_gateway_id}/{env}/GET/card/image",
        "{arn_prefix}:{api_broker_gateway_id}/{env}/GET/account/bankingdetail",
        "{arn_prefix}:{api_broker_gateway_id}/{env}/GET/repayment/card/hashcode",
        "{arn_prefix}:{api_broker_gateway_id}/{env}/GET/account/payees-list",
        "{arn_prefix}:{api_broker_gateway_id}/{env}/GET/account/payee/list",
        "{arn_prefix}:{api_broker_gateway_id}/{env}/POST/account/payee",
        "{arn_prefix}:{api_broker_gateway_id}/{env}/POST/account/transfer",
        "{arn_prefix}:{api_broker_gateway_id}/{env}/POST/card/status",
        "{arn_prefix}:{api_broker_gateway_id}/{env}/GET/account/terms",
        "{arn_prefix}:{account_service_oidc_gateway_id}/*/GET/credit/*",
        "{arn_prefix}:{account_service_oidc_gateway_id}/*/PATCH/credit/*",
        "{arn_prefix}:{account_service_oidc_gateway_id}/*/POST/credit/*/document/generate-url",
        "{arn_prefix}:{account_service_oidc_gateway_id}/*/GET/credit/*/documents",
        "{arn_prefix}:{account_service_oidc_gateway_id}/*/GET/credit/*/balance-breakdown",
        "{arn_prefix}:{card_service_oidc_gateway_id}/*/GET/*",
        "{arn_prefix}:{card_service_oidc_gateway_id}/*/POST/*/activate",
        "{arn_prefix}:{card_service_oidc_gateway_id}/*/POST/*/pin",
        "{arn_prefix}:{card_service_oidc_gateway_id}/*/POST/*/void",
        "{arn_prefix}:{card_service_oidc_gateway_id}/*/GET/*/pin-status",
        "{arn_prefix}:{card_service_oidc_gateway_id}/*/GET/public-encryption-key",
        "{arn_prefix}:{card_service_oidc_gateway_id}/*/POST/public-encryption-key",
        "{arn_prefix}:{alert_service_oidc_gateway_id}/*/POST/account-credit-alerts",
        "{arn_prefix}:{transaction_service_oidc_gateway_id}/*/GET/accounts/*",
      ],
      (local.common_config.scopes.DIRECT_DEBIT_SCOPE) = [
        "{arn_prefix}:{api_broker_gateway_id}/{env}/POST/repayment/directdebit/setup",
        "{arn_prefix}:{api_broker_gateway_id}/{env}/GET/repayment/directdebit/bank-details-lookup",
        "{arn_prefix}:{api_broker_gateway_id}/{env}/PUT/repayment/directdebit/setup",
        "{arn_prefix}:{api_broker_gateway_id}/{env}/GET/repayment/directdebit/payment-in-process",
      ],
      (local.common_config.scopes.DEBIT_CARD_ACCOUNT_SCOPE) = [
        "{arn_prefix}:{api_broker_gateway_id}/{env}/POST/deposit/addsourceoffunds",
      ],
      (local.common_config.scopes.CREDIT_CARD_DETAILS_SCOPE) = [
        "{arn_prefix}:{card_service_oidc_gateway_id}/*/GET/*/pin",
        "{arn_prefix}:{card_service_oidc_gateway_id}/*/GET/*/pan",
        "{arn_prefix}:{card_service_oidc_gateway_id}/*/GET/*/cvv",
      ],
      (local.common_config.scopes.CREDIT_CARD_ACTIVATION_SCOPE) = [
        "{arn_prefix}:{api_broker_gateway_id}/{env}/POST/card/activate",
        "{arn_prefix}:{api_broker_gateway_id}/{env}/GET/mobile/resendpin",
      ],
      (local.common_config.scopes.CREDIT_CARD_FREEZE_SCOPE) = [
        "{arn_prefix}:{card_service_oidc_gateway_id}/*/POST/*/freeze",
      ],
      (local.common_config.scopes.CREDIT_CARD_UNFREEZE_SCOPE) = [
        "{arn_prefix}:{card_service_oidc_gateway_id}/*/POST/*/unfreeze",
      ],
      (local.common_config.scopes.NAME_CHANGE_SCOPE) = [
        # not yet implemented
      ],
      (local.common_config.scopes.EMAIL_ADDRESS_CHANGE_SCOPE) = [
        "{arn_prefix}:{authentication_gateway_id}/*/POST/*/email-change/initiate",
        "{arn_prefix}:{authentication_gateway_id}/*/POST/*/email-change/validate",
        "{arn_prefix}:{authentication_gateway_id}/*/GET/*/email-change/redirect",
      ],
      (local.common_config.scopes.MOBILE_NUMBER_CHANGE_SCOPE) = [
        "{arn_prefix}:{authentication_gateway_id}/*/POST/*/phone-change/*",
      ],
      (local.common_config.scopes.ADDRESS_CHANGE_SCOPE) = [
        # not yet implemented
      ],
      (local.common_config.scopes.PASSCODE_CHANGE_SCOPE) = ["{arn_prefix}:{authentication_gateway_id}/*/POST/change-passcode"],
      (local.common_config.scopes.BIOMETRICS_CHANGE_SCOPE) = [
        "{arn_prefix}:{authentication_gateway_id}/*/POST/authorize/biometrics/register",
        "{arn_prefix}:{authentication_gateway_id}/*/POST/*/biometrics/register",
      ],
      (local.common_config.scopes.REPAYMENT_SCOPE) = [
        "{arn_prefix}:{repayment_service_gateway_id}/*/GET/cards",
        "{arn_prefix}:{repayment_service_gateway_id}/*/GET/direct-debit",
        "{arn_prefix}:{repayment_service_gateway_id}/*/POST/direct-debit",
        "{arn_prefix}:{repayment_service_gateway_id}/*/GET/direct-debit/*",
        "{arn_prefix}:{repayment_service_gateway_id}/*/DELETE/direct-debit/*",
        "{arn_prefix}:{repayment_service_gateway_id}/*/POST/direct-debit/hosted",
        "{arn_prefix}:{repayment_service_gateway_id}/*/PUT/direct-debit/hosted",
        "{arn_prefix}:{repayment_service_gateway_id}/*/GET/mandate/*",
        "{arn_prefix}:{repayment_service_gateway_id}/*/DELETE/mandate/*",
        "{arn_prefix}:{repayment_service_gateway_id}/*/POST/one-off-payment/card",
        "{arn_prefix}:{repayment_service_gateway_id}/*/POST/one-off-payment/pay-by-bank",
      ],
      (local.common_config.scopes.FIRST_TIME_LOGIN_SCOPE) = [
        # for resources that require an extra-scope, unless it's first time login
        "{arn_prefix}:{authentication_gateway_id}/*/POST/authorize/biometrics/register",
        "{arn_prefix}:{authentication_gateway_id}/*/POST/*/biometrics/register",
      ],
    },
    { for k, v in local.env_config.test_scopes : v => [] }
  ))
}

resource "aws_ssm_parameter" "scope_to_resource_url_map" {
  name  = local.SCOPE_TO_RESOURCE_MAP_URL_PARAM
  tier  = "Advanced"
  type  = "String"
  value = "${aws_s3_object.scope_to_resource_map_object.bucket}/${aws_s3_object.scope_to_resource_map_object.key}"
}

resource "aws_ssm_parameter" "non_conflicting_scope_groups" {
  name = local.NON_CONFLICTING_SCOPES_PARAM
  type = "String"
  value = jsonencode(concat(
    [
      local.otp_scopes,
      concat([local.common_config.scopes.CREDIT_CARD_DETAILS_SCOPE], local.otp_passcode_scopes),
      concat([local.common_config.scopes.CREDIT_CARD_ACTIVATION_SCOPE], local.otp_passcode_scopes),
      concat([local.common_config.scopes.CREDIT_CARD_FREEZE_SCOPE], local.otp_passcode_scopes),
      concat([local.common_config.scopes.CREDIT_CARD_UNFREEZE_SCOPE], local.otp_passcode_scopes),
      concat([local.common_config.scopes.NAME_CHANGE_SCOPE], local.otp_passcode_scopes),
      concat([local.common_config.scopes.EMAIL_ADDRESS_CHANGE_SCOPE], local.otp_passcode_scopes),
      concat([local.common_config.scopes.MOBILE_NUMBER_CHANGE_SCOPE], local.otp_passcode_scopes),
      concat([local.common_config.scopes.ADDRESS_CHANGE_SCOPE], local.otp_passcode_scopes),
      concat([local.common_config.scopes.PASSCODE_CHANGE_SCOPE], local.otp_passcode_scopes),
      concat([local.common_config.scopes.BIOMETRICS_CHANGE_SCOPE], local.otp_passcode_scopes),
    ],
    [for v in values(local.env_config.test_scopes) : concat([v], local.otp_passcode_scopes)]
  ))
}

resource "aws_ssm_parameter" "exclusive_scopes" {
  name = local.EXCLUSIVE_SCOPES_PARAM
  type = "String"
  value = jsonencode(
    setsubtract(
      concat(
        local.otp_scopes,
        local.otp_passcode_scopes,
        local.extra_scopes
      ),
      local.shared_scopes # removes shared scopes from exclusive scopes list
    ),
  )
}

resource "aws_ssm_parameter" "token_lifetimes" {
  name = local.TOKEN_LIFETIMES_PARAM
  type = "String"
  value = jsonencode(merge(
    {
      access_token_default                                      = 30,
      refresh_token_default                                     = 60,
      (local.common_config.scopes.CREDIT_CARD_DETAILS_SCOPE)    = 2,
      (local.common_config.scopes.CREDIT_CARD_ACTIVATION_SCOPE) = 10,
      (local.common_config.scopes.CREDIT_CARD_FREEZE_SCOPE)     = 2,
      (local.common_config.scopes.CREDIT_CARD_UNFREEZE_SCOPE)   = 2,
      (local.common_config.scopes.NAME_CHANGE_SCOPE)            = 10,
      (local.common_config.scopes.EMAIL_ADDRESS_CHANGE_SCOPE)   = 10,
      (local.common_config.scopes.MOBILE_NUMBER_CHANGE_SCOPE)   = 10,
      (local.common_config.scopes.ADDRESS_CHANGE_SCOPE)         = 10,
      (local.common_config.scopes.PASSCODE_CHANGE_SCOPE)        = 10
      (local.common_config.scopes.BIOMETRICS_CHANGE_SCOPE)      = 2,
    },
    { for k, v in local.env_config.test_scopes : v => 2 }
  ))
}

# APP TESTER PARAM
resource "aws_ssm_parameter" "staff_onmouuids" {
  name = local.STAFF_ONMOUUIDS_PARAM
  type = "String"
  value = jsonencode([
    "317c6a14-5048-4dd0-8b5f-8cb54ceb2ff8", "1642969b-4fb2-4750-a4d4-3aab39d30134",
    "60ae5f67-a2c2-4ba1-8034-c1902c306f07", "5f21987f-a694-4f22-9fe1-b363add418da",
    "0d7d9bc9-d27d-4dd5-9893-02f3d3eacdc8", "e73227bc-1bcb-41dd-a67f-e1cceb4c4f50",
    "22a3e6ca-8aee-449f-81b2-03305dfe128f", "60a48fbf-bb65-4de4-ba5d-10ffd219f871",
    "3980a3f8-33a3-4e32-9e87-031d91d21e88", "1d122208-6805-43da-b76f-57394bfcce6e",
    "a19b862b-1410-4197-a723-46d8341c6eff", "ea50e4b0-c92b-ee11-9965-0022481ab843",
    "2bd8bac7-a28b-42db-9f0a-5b1925ac5e2b"
  ])
  lifecycle {
    # ALLOWS MANUAL CONFIGURATION WITHOUT BEING OVERWRITTEN BY DEPLOYS
    ignore_changes = [value]
  }
}


# APP TESTER PARAM
resource "aws_ssm_parameter" "app_tester_login_config" {
  name = local.APP_TESTER_LOGIN_CONFIG
  type = "String"
  value = jsonencode({
    enabled  = false,   # ALWAYS SET THIS TO FALSE UNLESS NEW APP VERSION IS WITH TESTER
    sms_otp  = 5105     # CHECK ACTUAL VALUE IN AWS CONSOLE
    passcode = "907247" # CHECK ACTUAL VALUE IN AWS CONSOLE
  })
  lifecycle {
    # ALLOWS MANUAL CONFIGURATION WITHOUT BEING OVERWRITTEN BY DEPLOYS
    ignore_changes = [value]
  }
}


# TODO: move this to credit card onboarding service when live
resource "aws_ssm_parameter" "download_app_redirect_url_config" {
  name = local.env_config.params.DOWNLOAD_APP_REDIRECT_URL_CONFIG
  type = "String"
  value = jsonencode({
    wrong_device_url = var.ENVIRONMENT == "prod" ? "https://onmo.app/wrong-device" : "https://staging.onmo.app/wrong-device"
    android_url      = "market://"
    iOS_url          = "itms-apps://"
  })
  lifecycle {
    # ALLOWS MANUAL CONFIGURATION WITHOUT BEING OVERWRITTEN BY DEPLOYS
    ignore_changes = [value]
  }
}
