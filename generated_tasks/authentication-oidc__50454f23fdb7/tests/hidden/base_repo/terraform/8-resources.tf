locals {
  scope_to_resource_map_bucket_name = "${local.common_config.service.SERVICE_NAME}-scope-to-resource-map-${var.ENVIRONMENT}"
  iam_prefix                        = "arn:aws:iam::${var.AWS_ACCOUNT_ID}"
}

resource "aws_s3_bucket" "scope_to_resource_map_bucket" {
  bucket = local.scope_to_resource_map_bucket_name
  tags = {
    Name        = "authentitcation-oidc-${var.ENVIRONMENT}"
    Environment = "${var.ENVIRONMENT}"
    STAGE       = "${var.ENVIRONMENT}"
    Project     = var.GITHUB_REPO
  }
}

resource "aws_s3_bucket_policy" "scope_to_resource_map_bucket_policy" {
  bucket = aws_s3_bucket.scope_to_resource_map_bucket.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          AWS = "${local.iam_prefix}:root",
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.scope_to_resource_map_bucket.arn}/*"
      }
    ]
  })
}

resource "aws_s3_object" "scope_to_resource_map_object" {
  bucket = aws_s3_bucket.scope_to_resource_map_bucket.id
  key    = "scope_to_resource_map.json"
  content = jsonencode(merge(
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
        "{arn_prefix}:{customer_service_oidc_gateway_id}/*/POST/*/confirm-address",
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
        "{arn_prefix}:{transaction_service_oidc_gateway_id}/*/POST/transaction-challenge-response",
        "{arn_prefix}:{transaction_service_oidc_gateway_id}/*/GET/transaction-challenge/*",
        "{arn_prefix}:{device_channel_gateway_id}/*/$connect",
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
        "{arn_prefix}:{repayment_service_gateway_id}/*/GET/payment-receipt/*",
        "{arn_prefix}:{repayment_service_gateway_id}/*/POST/one-off-payment/checkout",
        "{arn_prefix}:{repayment_service_gateway_id}/*/POST/one-off-payment/intent",
        "{arn_prefix}:{repayment_service_gateway_id}/*/GET/payment-status/*",
        "{arn_prefix}:{repayment_service_gateway_id}/*/GET/cpa/subscription",
      ],
      (local.common_config.scopes.FIRST_TIME_LOGIN_SCOPE) = [
        # for resources that require an extra-scope, unless it's first time login
        "{arn_prefix}:{authentication_gateway_id}/*/POST/authorize/biometrics/register",
        "{arn_prefix}:{authentication_gateway_id}/*/POST/*/biometrics/register",
      ],
      (local.common_config.scopes.BIOMETRICS_CHECK_SCOPE) = [
        "{arn_prefix}:{biometrics_service_gateway_id}/*/GET/history/me",
        "{arn_prefix}:{biometrics_service_gateway_id}/*/POST/biometric-check/*/start",
      ],
    },
    var.ENVIRONMENT == "prod" ? {} : { for k, v in local.env_config.test_scopes : v => [] }
  ))
}
