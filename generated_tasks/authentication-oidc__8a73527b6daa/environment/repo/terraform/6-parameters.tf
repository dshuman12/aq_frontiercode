locals {
  # -- otp scopes
  otp_scopes = [
    var.APR_SCOPE,
    var.CLM_SCOPE,
    var.CUSTOMER_CARE_SCOPE,
    var.LOAN_ACCOUNT_ID_SCOPE, # TODO: deprecate when not in use & replaced with credit-card-account-id
    var.CREDIT_CARD_ACCOUNT_ID_SCOPE,
    var.REPAYMENT_SCOPE
  ]
  # -- otp-passcode scopes
  otp_passcode_scopes = [
    var.CUSTOMER_PROFILE_SCOPE,
    var.SUPPORT_SERVICES_SCOPE,
    var.CREDIT_CARD_ACCOUNT_SCOPE,
    var.CREDIT_CARD_ACCOUNT_ID_SCOPE,
    var.CREDIT_CARD_ID_SCOPE,
    var.DIRECT_DEBIT_SCOPE,
    var.DEBIT_CARD_ACCOUNT_SCOPE,
    var.AUTH_SERVICES_SCOPE,
    var.REPAYMENT_SCOPE,
    var.FIRST_TIME_LOGIN_SCOPE # for resources that require an extra-scope, unless it's first time login
  ]
  # -- shared scopes -> scopes present in both otp_scopes and otp_passcode_scopes
  shared_scopes = setintersection(local.otp_scopes, local.otp_passcode_scopes)

  # -- extra-scope scopes
  extra_scopes = concat(
    [
      var.CREDIT_CARD_DETAILS_SCOPE,
      var.CREDIT_CARD_ACTIVATION_SCOPE,
      var.CREDIT_CARD_FREEZE_SCOPE,
      var.CREDIT_CARD_UNFREEZE_SCOPE,
      var.NAME_CHANGE_SCOPE,
      var.EMAIL_ADDRESS_CHANGE_SCOPE,
      var.MOBILE_NUMBER_CHANGE_SCOPE,
      var.ADDRESS_CHANGE_SCOPE,
      var.PASSCODE_CHANGE_SCOPE,
      var.BIOMETRICS_CHANGE_SCOPE,
    ],
    var.ENVIRONMENT == "prod" ? [] : [var.TEST_OTP_STEP_EXTRA_SCOPE, var.TEST_BIOMETRICS_STEP_EXTRA_SCOPE]
  )
}

data "aws_ssm_parameter" "pty_subnets" {
  name = "/onmo/paymentology/service-layer/subnetIds/${var.ENVIRONMENT}"
}

data "aws_ssm_parameter" "pty_security_groups" {
  name = "/onmo/paymentology/service-layer/securityGroupIds/${var.ENVIRONMENT}"
}

resource "aws_ssm_parameter" "auth_flow_scopes" {
  name = var.AUTH_FLOW_SCOPES_PARAM
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
resource "aws_ssm_parameter" "scope_to_resource_map" {
  name = var.SCOPE_TO_RESOURCE_MAP_PARAM
  tier = "Advanced"
  type = "String"
  value = jsonencode(merge(
    {
      (var.CLM_SCOPE) = [
        "{arn_prefix}:{api_broker_gateway_id}/{env}/GET/account/clm/*",
        "{arn_prefix}:{api_broker_gateway_id}/{env}/PUT/account/clm/*",
        "{arn_prefix}:{api_broker_gateway_id}/{env}/PUT/account/clm/*/limit-change",
        "{arn_prefix}:{api_broker_gateway_id}/{env}/GET/account/clm/*/offer-validity",
      ],
      (var.APR_SCOPE) = [
        "{arn_prefix}:{apr_gateway_id}/{env}/POST/*/opt-out/verify-otp",
        "{arn_prefix}:{apr_gateway_id}/{env}/GET/*",
        "{arn_prefix}:{apr_gateway_id}/{env}/GET/*/change",
        "{arn_prefix}:{apr_gateway_id}/{env}/GET/*/declined",
        "{arn_prefix}:{apr_gateway_id}/{env}/POST/*/opt-out/send-otp",
      ],
      (var.CUSTOMER_CARE_SCOPE) = [
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
      (var.LOAN_ACCOUNT_ID_SCOPE)        = ["{arn_prefix}:{authentication_gateway_id}/*/GET/user-info"],
      (var.CREDIT_CARD_ACCOUNT_ID_SCOPE) = ["{arn_prefix}:{authentication_gateway_id}/*/GET/user-info"],
      (var.CREDIT_CARD_ID_SCOPE)         = ["{arn_prefix}:{authentication_gateway_id}/*/GET/user-info"],
      (var.AUTH_SERVICES_SCOPE) = [
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
      (var.CUSTOMER_PROFILE_SCOPE) = [
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
      (var.SUPPORT_SERVICES_SCOPE) = [
        "{arn_prefix}:{api_broker_gateway_id}/{env}/POST/mobile/store-token",
        "{arn_prefix}:{api_broker_gateway_id}/{env}/GET/account/postcodecheck",
      ],
      (var.CREDIT_CARD_ACCOUNT_SCOPE) = [
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
      (var.DIRECT_DEBIT_SCOPE) = [
        "{arn_prefix}:{api_broker_gateway_id}/{env}/POST/repayment/directdebit/setup",
        "{arn_prefix}:{api_broker_gateway_id}/{env}/GET/repayment/directdebit/bank-details-lookup",
        "{arn_prefix}:{api_broker_gateway_id}/{env}/PUT/repayment/directdebit/setup",
        "{arn_prefix}:{api_broker_gateway_id}/{env}/GET/repayment/directdebit/payment-in-process",
      ],
      (var.DEBIT_CARD_ACCOUNT_SCOPE) = [
        "{arn_prefix}:{api_broker_gateway_id}/{env}/POST/deposit/addsourceoffunds",
      ],
      (var.CREDIT_CARD_DETAILS_SCOPE) = [
        "{arn_prefix}:{card_service_oidc_gateway_id}/*/GET/*/pin",
        "{arn_prefix}:{card_service_oidc_gateway_id}/*/GET/*/pan",
        "{arn_prefix}:{card_service_oidc_gateway_id}/*/GET/*/cvv",
      ],
      (var.CREDIT_CARD_ACTIVATION_SCOPE) = [
        "{arn_prefix}:{api_broker_gateway_id}/{env}/POST/card/activate",
        "{arn_prefix}:{api_broker_gateway_id}/{env}/GET/mobile/resendpin",
      ],
      (var.CREDIT_CARD_FREEZE_SCOPE) = [
        "{arn_prefix}:{card_service_oidc_gateway_id}/*/POST/*/freeze",
      ],
      (var.CREDIT_CARD_UNFREEZE_SCOPE) = [
        "{arn_prefix}:{card_service_oidc_gateway_id}/*/POST/*/unfreeze",
      ],
      (var.NAME_CHANGE_SCOPE) = [
        # not yet implemented
      ],
      (var.EMAIL_ADDRESS_CHANGE_SCOPE) = [
        "{arn_prefix}:{authentication_gateway_id}/*/POST/*/email-change/initiate",
        "{arn_prefix}:{authentication_gateway_id}/*/POST/*/email-change/validate",
        "{arn_prefix}:{authentication_gateway_id}/*/GET/*/email-change/redirect",
      ],
      (var.MOBILE_NUMBER_CHANGE_SCOPE) = [
        "{arn_prefix}:{authentication_gateway_id}/*/POST/*/phone-change/*",
      ],
      (var.ADDRESS_CHANGE_SCOPE) = [
        # not yet implemented
      ],
      (var.PASSCODE_CHANGE_SCOPE) = ["{arn_prefix}:{authentication_gateway_id}/*/POST/change-passcode"],
      (var.BIOMETRICS_CHANGE_SCOPE) = [
        "{arn_prefix}:{authentication_gateway_id}/*/POST/authorize/biometrics/register",
        "{arn_prefix}:{authentication_gateway_id}/*/POST/*/biometrics/register",
      ],
      (var.REPAYMENT_SCOPE) = [
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
      (var.FIRST_TIME_LOGIN_SCOPE) = [
        # for resources that require an extra-scope, unless it's first time login
        "{arn_prefix}:{authentication_gateway_id}/*/POST/authorize/biometrics/register",
        "{arn_prefix}:{authentication_gateway_id}/*/POST/*/biometrics/register",
      ]
    },
    var.ENVIRONMENT == "prod" ? {} : { (var.TEST_OTP_STEP_EXTRA_SCOPE) = [], (var.TEST_BIOMETRICS_STEP_EXTRA_SCOPE) = [] }
  ))
}

resource "aws_ssm_parameter" "scope_to_resource_url_map" {
  name  = var.SCOPE_TO_RESOURCE_MAP_URL_PARAM
  tier  = "Advanced"
  type  = "String"
  value = "${aws_s3_object.scope_to_resource_map_object.bucket}/${aws_s3_object.scope_to_resource_map_object.key}"
}

resource "aws_ssm_parameter" "non_conflicting_scope_groups" {
  name = var.NON_CONFLICTING_SCOPES_PARAM
  type = "String"
  value = jsonencode(concat(
    [
      local.otp_scopes,
      concat([var.CREDIT_CARD_DETAILS_SCOPE], local.otp_passcode_scopes),
      concat([var.CREDIT_CARD_ACTIVATION_SCOPE], local.otp_passcode_scopes),
      concat([var.CREDIT_CARD_FREEZE_SCOPE], local.otp_passcode_scopes),
      concat([var.CREDIT_CARD_UNFREEZE_SCOPE], local.otp_passcode_scopes),
      concat([var.NAME_CHANGE_SCOPE], local.otp_passcode_scopes),
      concat([var.EMAIL_ADDRESS_CHANGE_SCOPE], local.otp_passcode_scopes),
      concat([var.MOBILE_NUMBER_CHANGE_SCOPE], local.otp_passcode_scopes),
      concat([var.ADDRESS_CHANGE_SCOPE], local.otp_passcode_scopes),
      concat([var.PASSCODE_CHANGE_SCOPE], local.otp_passcode_scopes),
      concat([var.BIOMETRICS_CHANGE_SCOPE], local.otp_passcode_scopes),
    ],
    var.ENVIRONMENT == "prod" ? [] : [concat([var.TEST_OTP_STEP_EXTRA_SCOPE], local.otp_passcode_scopes), concat([var.TEST_BIOMETRICS_STEP_EXTRA_SCOPE], local.otp_passcode_scopes)]
  ))
}

resource "aws_ssm_parameter" "exclusive_scopes" {
  name = var.EXCLUSIVE_SCOPES_PARAM
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
  name = var.TOKEN_LIFETIMES_PARAM
  type = "String"
  value = jsonencode(merge(
    {
      access_token_default               = 30,
      refresh_token_default              = 60,
      (var.CREDIT_CARD_DETAILS_SCOPE)    = 2,
      (var.CREDIT_CARD_ACTIVATION_SCOPE) = 10,
      (var.CREDIT_CARD_FREEZE_SCOPE)     = 2,
      (var.CREDIT_CARD_UNFREEZE_SCOPE)   = 2,
      (var.NAME_CHANGE_SCOPE)            = 10,
      (var.EMAIL_ADDRESS_CHANGE_SCOPE)   = 10,
      (var.MOBILE_NUMBER_CHANGE_SCOPE)   = 10,
      (var.ADDRESS_CHANGE_SCOPE)         = 10,
      (var.PASSCODE_CHANGE_SCOPE)        = 10
      (var.BIOMETRICS_CHANGE_SCOPE)      = 2,
    },
    var.ENVIRONMENT == "prod" ? {} : { (var.TEST_OTP_STEP_EXTRA_SCOPE) = 2, (var.TEST_BIOMETRICS_STEP_EXTRA_SCOPE) = 2 }
  ))
}

# APP TESTER PARAM
resource "aws_ssm_parameter" "staff_onmouuids" {
  name = var.STAFF_ONMOUUIDS_PARAM
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
  name = var.APP_TESTER_LOGIN_CONFIG
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
  name = var.DOWNLOAD_APP_REDIRECT_URL_CONFIG
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
