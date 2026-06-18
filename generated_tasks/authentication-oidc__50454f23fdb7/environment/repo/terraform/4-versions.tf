# ──────────────────────────────────────────────────────────────────────────────
# API Version Stages
# ──────────────────────────────────────────────────────────────────────────────
#
# Each version module creates one API Gateway stage per minor version entry.
# AWS enforces a quota on stages per REST API (default 10, currently 15).
# Exceeding this quota causes terraform apply to hang indefinitely on stage
# creation — AWS silently rejects the request and the provider retries forever.
#
# To prevent this:
#   1. Minor version lists are defined as locals (below) so the stage guard
#      can count them.
#   2. The "api_gateway_stage_limit" precondition fails terraform plan before
#      any resources are touched if the total would exceed the quota.
#
# When adding a new minor version:
#   - Add it to the relevant local list below
#   - If the guard fails, either prune old minor versions no longer receiving
#     traffic, or request a quota increase in the AWS console
#     (Service Quotas > API Gateway > Stages per API)
#
# Stage budget:
#   4 fixed (v1-v4, 1 stage each) + 1 fixed ("next") + v5 minors + v6 minors + v7 minors
# ──────────────────────────────────────────────────────────────────────────────

locals {
  v5_minor_versions = [47]
  v6_minor_versions = [17]
  v7_minor_versions = [8, 9, 10]

  api_gateway_stage_count = 5 + length(local.v5_minor_versions) + length(local.v6_minor_versions) + length(local.v7_minor_versions) + length(var.PR_VERSIONS)
  api_gateway_stage_quota = 15

  # Shared between v7 and PR preview modules — update here when adding new API functions
  current_lambda_functions = [
    module.token,
    module.authorizer,
    module.logout,
    module.eligibility,
    module.userInfo,
    module.authorize,
    module.sendOTP,
    module.verifyOTP,
    module.otp-passcode-authorize,
    module.otp-passcode-sendOTP,
    module.otp-passcode-resendOTP,
    module.otp-passcode-verifyOTP,
    module.otp-passcode-verifyPasscode,
    module.extra-scope-authorize,
    module.extra-scope-sendOTP,
    module.extra-scope-resendOTP,
    module.extra-scope-verifyOTP,
    module.extra-scope-verifyPasscode,
    module.extra-scope-verifyBiometrics,
    module.biometrics-reg-initiate,
    module.biometrics-reg-complete,
    module.biometrics-authorize,
    module.biometrics-verify,
    module.forgot-pass-authorize-out,
    module.forgot-pass-authorize-in,
    module.forgot-pass-sendOTP,
    module.forgot-pass-resendOTP,
    module.forgot-pass-verifyOTP,
    module.forgot-pass-sendEmail,
    module.forgot-pass-resendEmail,
    module.forgot-pass-verifyEmail,
    module.forgot-pass-redirect,
    module.changePasscode,
    module.appDownloadRedirect,
    module.stats,
    module.statsHistory,
    module.email-change-initiate,
    module.email-change-redirect,
    module.email-change-validate,
    module.email-change-email-resend,
    module.email-change-otp-resend,
    module.phone-change-initiate,
    module.phone-change-validate-otp,
    module.phone-change-otp-resend,
    module.phone-change-email-send,
    module.phone-change-email-verify,
    module.phone-change-email-redirect,
    module.phone-change-email-resend,
  ]
}

resource "terraform_data" "api_gateway_stage_limit" {
  lifecycle {
    precondition {
      condition     = local.api_gateway_stage_count <= local.api_gateway_stage_quota
      error_message = "Total API Gateway stages (${local.api_gateway_stage_count}) would exceed quota (${local.api_gateway_stage_quota}). Prune old minor versions or request a quota increase."
    }
  }
}

module "v1" {
  source         = "app.terraform.io/onmo/modules/aws//version-api"
  version        = "0.6.4"
  service_config = local.service_config
  gateway_config = local.gateway_config

  rest_api_gateway = module.rest_api_gateway
  version_name     = "v1"

  lambda_functions = [
    module.authorize,
    module.authorizer,
    module.sendOTP,
    module.verifyOTP,
    module.token
  ]
}

module "v2" {
  source         = "app.terraform.io/onmo/modules/aws//version-api"
  version        = "0.6.4"
  service_config = local.service_config
  gateway_config = local.gateway_config

  rest_api_gateway = module.rest_api_gateway
  version_name     = "v2"

  lambda_functions = [
    module.authorize,
    module.authorizer,
    module.sendOTP,
    module.verifyOTP,
    module.token,
    module.userInfo
  ]
}

module "v3" {
  source         = "app.terraform.io/onmo/module-version-api/aws"
  version        = "1.0.0"
  service_config = local.service_config
  gateway_config = local.gateway_config

  rest_api_gateway = module.rest_api_gateway
  version_name     = "v3"

  lambda_functions = [
    module.authorize,
    module.authorizer,
    module.sendOTP,
    module.verifyOTP,
    module.token,
    module.userInfo
  ]
}

module "v4" {
  source         = "app.terraform.io/onmo/module-version-api/aws"
  version        = "1.0.0"
  service_config = local.service_config
  gateway_config = local.gateway_config

  rest_api_gateway = module.rest_api_gateway
  version_name     = "v4"

  lambda_functions = [
    module.authorize,
    module.authorizer,
    module.sendOTP,
    module.verifyOTP,
    module.token,
    module.userInfo
  ]
}

module "v5" {
  source         = "app.terraform.io/onmo/module-version-api/aws"
  version        = "~> 3.0"
  service_config = local.service_config
  gateway_config = local.gateway_config

  rest_api_gateway = module.rest_api_gateway
  version_name     = "v5"
  minor_versions   = local.v5_minor_versions

  lambda_functions = [
    module.token,
    module.authorizer,
    module.logout,
    module.eligibility,
    module.userInfo,
    module.authorize,
    module.sendOTP,
    module.verifyOTP,
    module.otp-passcode-authorize,
    module.otp-passcode-sendOTP,
    module.otp-passcode-resendOTP,
    module.otp-passcode-verifyOTP,
    module.otp-passcode-verifyPasscode,
    module.extra-scope-authorize,
    module.extra-scope-sendOTP,
    module.extra-scope-resendOTP,
    module.extra-scope-verifyOTP,
    module.extra-scope-verifyPasscode,
    module.extra-scope-verifyBiometrics,
    module.biometrics-reg-initiate,
    module.biometrics-reg-complete,
    module.biometrics-authorize,
    module.biometrics-verify,
    module.forgot-pass-authorize-out,
    module.forgot-pass-authorize-in,
    module.forgot-pass-sendOTP,
    module.forgot-pass-resendOTP,
    module.forgot-pass-verifyOTP,
    module.forgot-pass-sendEmail,
    module.forgot-pass-resendEmail,
    module.forgot-pass-verifyEmail,
    module.forgot-pass-redirect,
    module.changePasscode,
    module.appDownloadRedirect,
    module.stats,
    module.statsHistory,
    module.email-change-initiate,
    module.email-change-redirect,
    module.email-change-validate,
    module.email-change-email-resend,
    module.email-change-otp-resend,
    module.phone-change-initiate,
    module.phone-change-validate-otp,
    module.phone-change-otp-resend,
    module.phone-change-email-send,
    module.phone-change-email-verify,
    module.phone-change-email-redirect,
    module.phone-change-email-resend,
  ]
}

module "v6" {
  source         = "app.terraform.io/onmo/module-version-api/aws"
  version        = "~> 4.0"
  service_config = local.service_config
  gateway_config = local.gateway_config

  rest_api_gateway = module.rest_api_gateway
  version_name     = "v6"
  minor_versions   = local.v6_minor_versions

  lambda_functions = [
    module.token,
    module.authorizer,
    module.logout,
    module.eligibility,
    module.userInfo,
    module.authorize,
    module.sendOTP,
    module.verifyOTP,
    module.otp-passcode-authorize,
    module.otp-passcode-sendOTP,
    module.otp-passcode-resendOTP,
    module.otp-passcode-verifyOTP,
    module.otp-passcode-verifyPasscode,
    module.extra-scope-authorize,
    module.extra-scope-sendOTP,
    module.extra-scope-resendOTP,
    module.extra-scope-verifyOTP,
    module.extra-scope-verifyPasscode,
    module.extra-scope-verifyBiometrics,
    module.biometrics-reg-initiate,
    module.biometrics-reg-complete,
    module.biometrics-authorize,
    module.biometrics-verify,
    module.forgot-pass-authorize-out,
    module.forgot-pass-authorize-in,
    module.forgot-pass-sendOTP,
    module.forgot-pass-resendOTP,
    module.forgot-pass-verifyOTP,
    module.forgot-pass-sendEmail,
    module.forgot-pass-resendEmail,
    module.forgot-pass-verifyEmail,
    module.forgot-pass-redirect,
    module.changePasscode,
    module.appDownloadRedirect,
    module.stats,
    module.statsHistory,
    module.email-change-initiate,
    module.email-change-redirect,
    module.email-change-validate,
    module.email-change-email-resend,
    module.email-change-otp-resend,
    module.phone-change-initiate,
    module.phone-change-validate-otp,
    module.phone-change-otp-resend,
    module.phone-change-email-send,
    module.phone-change-email-verify,
    module.phone-change-email-redirect,
    module.phone-change-email-resend,
  ]
}

module "v7" {
  source         = "app.terraform.io/onmo/module-version-api/aws"
  version        = "~> 4.0"
  service_config = local.service_config
  gateway_config = local.gateway_config

  rest_api_gateway = module.rest_api_gateway
  version_name     = "v7"
  minor_versions   = local.v7_minor_versions

  lambda_functions = local.current_lambda_functions
}

# ── PR preview environments (Tier 1: API-only) ────────────────────────
#
# Each entry in var.PR_VERSIONS gets its own API Gateway stage and
# Lambda aliases for all API/auth functions. Event handlers, SQS
# consumers, and scheduled functions continue to use staging code.
#
# Managed by pr.deploy.yaml (creates) and pr.cleanup.yaml (destroys).
# The staging deploy workflow queries active `preview` labels so that
# a staging deploy never accidentally destroys active PR previews.

module "pr" {
  for_each = var.PR_VERSIONS
  source   = "app.terraform.io/onmo/module-version-api/aws"
  version  = "~> 4.0"

  service_config = local.service_config
  gateway_config = local.gateway_config

  rest_api_gateway = module.rest_api_gateway
  version_name     = each.key
  minor_versions   = [each.value]

  lambda_functions = local.current_lambda_functions
}
