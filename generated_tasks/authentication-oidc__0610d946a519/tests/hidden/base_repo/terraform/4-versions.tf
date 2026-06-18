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
  minor_versions   = [40, 41, 42, 43, 44, 45, 46, 47]

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
