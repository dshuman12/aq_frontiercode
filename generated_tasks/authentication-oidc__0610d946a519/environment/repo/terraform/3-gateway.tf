locals {
  cors = {
    allow_origins        = [var.FRONTEND_URL],
    allow_custom_headers = ["Content-Type", "Authorization", "Cookie"]
  }
}

module "rest_api_gateway" {
  source         = "app.terraform.io/onmo/module-rest-api-gateway/aws"
  version        = "~> 1.0"
  service_config = local.service_config
  gateway_config = local.gateway_config

  description = "OIDC Authentication Service"

  aws_integration_paths = [
    # -- general
    {
      path_from_root = "/token"
      integrations   = [{ method = "POST", lambda_function_name = module.token.name }]
      cors           = local.cors
    },
    {
      path_from_root = "/logout"
      integrations   = [{ method = "POST", lambda_function_name = module.logout.name, lambda_authorizer_name = module.authorizer.name }]
      cors           = local.cors
    },
    {
      path_from_root = "/eligibility"
      integrations   = [{ method = "POST", lambda_function_name = module.eligibility.name, lambda_authorizer_name = module.authorizer.name }]
      cors           = local.cors
    },

    # -- otp
    {
      path_from_root = "/authorize/otp"
      integrations   = [{ method = "POST", lambda_function_name = module.authorize.name }]
      cors           = local.cors
    },
    {
      path_from_root = "/{transaction_id}/otp/send"
      integrations   = [{ method = "POST", lambda_function_name = module.sendOTP.name }]
      cors           = local.cors
    },
    {
      path_from_root = "/{transaction_id}/otp/verify"
      integrations   = [{ method = "POST", lambda_function_name = module.verifyOTP.name }]
      cors           = local.cors
    },

    # -- otp-passcode 
    {
      path_from_root = "/authorize/otp-passcode"
      cors           = local.cors
      integrations   = [{ method = "POST", lambda_function_name = module.otp-passcode-authorize.name }]
    },
    {
      path_from_root = "/{transaction_id}/otp-passcode/otp/send"
      cors           = local.cors
      integrations   = [{ method = "POST", lambda_function_name = module.otp-passcode-sendOTP.name }]
    },
    {
      path_from_root = "/{transaction_id}/otp-passcode/otp/resend"
      cors           = local.cors
      integrations   = [{ method = "POST", lambda_function_name = module.otp-passcode-resendOTP.name }]
    },
    {
      path_from_root = "/{transaction_id}/otp-passcode/otp/verify"
      cors           = local.cors
      integrations   = [{ method = "POST", lambda_function_name = module.otp-passcode-verifyOTP.name }]
    },
    {
      path_from_root = "/{transaction_id}/otp-passcode/passcode/verify"
      cors           = local.cors
      integrations   = [{ method = "POST", lambda_function_name = module.otp-passcode-verifyPasscode.name }]
    },

    # -- biometrics
    # ---> registration
    {
      path_from_root = "/authorize/biometrics/register"
      cors           = local.cors
      integrations   = [{ method = "POST", lambda_function_name = module.biometrics-reg-initiate.name, lambda_authorizer_name = module.authorizer.name }]
    },
    {
      path_from_root = "/{transaction_id}/biometrics/register"
      cors           = local.cors
      integrations   = [{ method = "POST", lambda_function_name = module.biometrics-reg-complete.name, lambda_authorizer_name = module.authorizer.name }]
    },
    # ---> authorization
    {
      path_from_root = "/authorize/biometrics"
      cors           = local.cors
      integrations   = [{ method = "POST", lambda_function_name = module.biometrics-authorize.name }]
    },
    {
      path_from_root = "/{transaction_id}/biometrics/verify"
      cors           = local.cors
      integrations   = [{ method = "POST", lambda_function_name = module.biometrics-verify.name }]
    },

    # -- extra-scope
    {
      path_from_root = "/authorize/extra-scope"
      cors           = local.cors
      integrations   = [{ method = "POST", lambda_function_name = module.extra-scope-authorize.name, lambda_authorizer_name = module.authorizer.name }]
    },
    {
      path_from_root = "/{transaction_id}/extra-scope/otp/send"
      cors           = local.cors
      integrations   = [{ method = "POST", lambda_function_name = module.extra-scope-sendOTP.name, lambda_authorizer_name = module.authorizer.name }]
    },
    {
      path_from_root = "/{transaction_id}/extra-scope/otp/resend"
      cors           = local.cors
      integrations   = [{ method = "POST", lambda_function_name = module.extra-scope-resendOTP.name, lambda_authorizer_name = module.authorizer.name }]
    },
    {
      path_from_root = "/{transaction_id}/extra-scope/otp/verify"
      cors           = local.cors
      integrations   = [{ method = "POST", lambda_function_name = module.extra-scope-verifyOTP.name, lambda_authorizer_name = module.authorizer.name }]
    },
    {
      path_from_root = "/{transaction_id}/extra-scope/passcode/verify"
      cors           = local.cors
      integrations   = [{ method = "POST", lambda_function_name = module.extra-scope-verifyPasscode.name, lambda_authorizer_name = module.authorizer.name }]
    },
    {
      path_from_root = "/{transaction_id}/extra-scope/biometrics/verify"
      cors           = local.cors
      integrations   = [{ method = "POST", lambda_function_name = module.extra-scope-verifyBiometrics.name, lambda_authorizer_name = module.authorizer.name }]
    },

    # -- email-change
    {
      path_from_root = "/{transaction_id}/email-change/initiate"
      cors           = local.cors
      integrations   = [{ method = "POST", lambda_function_name = module.email-change-initiate.name, lambda_authorizer_name = module.authorizer.name }]
    },
    {
      path_from_root = "/{transaction_id}/email-change/redirect"
      cors           = local.cors
      integrations   = [{ method = "GET", lambda_function_name = module.email-change-redirect.name }]
    },
    {
      path_from_root = "/{transaction_id}/email-change/validate"
      cors           = local.cors
      integrations   = [{ method = "POST", lambda_function_name = module.email-change-validate.name, lambda_authorizer_name = module.authorizer.name }]
    },
    {
      path_from_root = "/{transaction_id}/email-change/email/resend"
      cors           = local.cors
      integrations   = [{ method = "POST", lambda_function_name = module.email-change-email-resend.name, lambda_authorizer_name = module.authorizer.name }]
    },
    {
      path_from_root = "/{transaction_id}/email-change/otp/resend"
      cors           = local.cors
      integrations   = [{ method = "POST", lambda_function_name = module.email-change-otp-resend.name, lambda_authorizer_name = module.authorizer.name }]
    },

    # -- phone-change
    {
      path_from_root = "/{transaction_id}/phone-change/initiate"
      cors           = local.cors
      integrations   = [{ method = "POST", lambda_function_name = module.phone-change-initiate.name, lambda_authorizer_name = module.authorizer.name }]
    },
    {
      path_from_root = "/{transaction_id}/phone-change/otp/verify"
      cors           = local.cors
      integrations   = [{ method = "POST", lambda_function_name = module.phone-change-validate-otp.name, lambda_authorizer_name = module.authorizer.name }]
    },
    {
      path_from_root = "/{transaction_id}/phone-change/otp/resend"
      cors           = local.cors
      integrations   = [{ method = "POST", lambda_function_name = module.phone-change-otp-resend.name, lambda_authorizer_name = module.authorizer.name }]
    },
    {
      path_from_root = "/{transaction_id}/phone-change/email/send"
      cors           = local.cors
      integrations   = [{ method = "POST", lambda_function_name = module.phone-change-email-send.name, lambda_authorizer_name = module.authorizer.name }]
    },
    {
      path_from_root = "/{transaction_id}/phone-change/email/verify"
      cors           = local.cors
      integrations   = [{ method = "POST", lambda_function_name = module.phone-change-email-verify.name, lambda_authorizer_name = module.authorizer.name }]
    },
    {
      path_from_root = "/{transaction_id}/phone-change/email/redirect"
      cors           = local.cors
      integrations   = [{ method = "GET", lambda_function_name = module.phone-change-email-redirect.name }]
    },
    {
      path_from_root = "/{transaction_id}/phone-change/email/resend"
      cors           = local.cors
      integrations   = [{ method = "POST", lambda_function_name = module.phone-change-email-resend.name, lambda_authorizer_name = module.authorizer.name }]
    },

    # -- forgotten-passcode
    {
      path_from_root = "/authorize/forgotten-passcode/logged-out"
      cors           = local.cors
      integrations   = [{ method = "POST", lambda_function_name = module.forgot-pass-authorize-out.name }]
    },
    {
      path_from_root = "/authorize/forgotten-passcode/logged-in"
      cors           = local.cors
      integrations   = [{ method = "POST", lambda_function_name = module.forgot-pass-authorize-in.name, lambda_authorizer_name = module.authorizer.name }]
    },
    {
      path_from_root = "/{transaction_id}/forgotten-passcode/otp/send"
      cors           = local.cors
      integrations   = [{ method = "POST", lambda_function_name = module.forgot-pass-sendOTP.name }]
    },
    {
      path_from_root = "/{transaction_id}/forgotten-passcode/otp/resend"
      cors           = local.cors
      integrations   = [{ method = "POST", lambda_function_name = module.forgot-pass-resendOTP.name }]
    },
    {
      path_from_root = "/{transaction_id}/forgotten-passcode/otp/verify"
      cors           = local.cors
      integrations   = [{ method = "POST", lambda_function_name = module.forgot-pass-verifyOTP.name }]
    },
    {
      path_from_root = "/{transaction_id}/forgotten-passcode/email/send"
      cors           = local.cors
      integrations   = [{ method = "POST", lambda_function_name = module.forgot-pass-sendEmail.name }]
    },
    {
      path_from_root = "/{transaction_id}/forgotten-passcode/email/resend"
      cors           = local.cors
      integrations   = [{ method = "POST", lambda_function_name = module.forgot-pass-resendEmail.name }]
    },
    {
      path_from_root = "/{transaction_id}/forgotten-passcode/email/verify"
      cors           = local.cors
      integrations   = [{ method = "POST", lambda_function_name = module.forgot-pass-verifyEmail.name }]
    },
    {
      path_from_root = "/{transaction_id}/forgotten-passcode/email/redirect"
      cors           = local.cors
      integrations   = [{ method = "GET", lambda_function_name = module.forgot-pass-redirect.name }]
    },

    # -- other
    {
      path_from_root = "/change-passcode"
      cors           = local.cors
      integrations   = [{ method = "POST", lambda_function_name = module.changePasscode.name, lambda_authorizer_name = module.authorizer.name }]
    },
    {
      path_from_root = "/user-info"
      cors           = local.cors
      integrations   = [{ method = "GET", lambda_function_name = module.userInfo.name, lambda_authorizer_name = module.authorizer.name }]
    },
    {
      path_from_root = "/app-download-redirect"
      cors           = local.cors
      integrations   = [{ method = "GET", lambda_function_name = module.appDownloadRedirect.name }]
    },
    {
      path_from_root = "/stats"
      cors           = local.cors
      integrations = [{
        method               = "GET",
        lambda_function_name = module.stats.name,
        deny_conditions      = jsonencode([{ NotIpAddress = { "aws:SourceIp" = ["34.255.221.99", "46.51.167.63"] } }])
      }]
    },
    {
      path_from_root = "/stats/history"
      cors           = local.cors
      integrations = [{
        method               = "GET",
        lambda_function_name = module.statsHistory.name,
        deny_conditions      = jsonencode([{ NotIpAddress = { "aws:SourceIp" = ["34.255.221.99", "46.51.167.63"] } }])
      }]
    }
  ]

  lambda_authorizers = [
    {
      lambda_function_name = module.authorizer.name,
      auth_config          = { type = "token", location = "header", key_name = "Authorization" }
      ttl                  = 0
    }
  ]
}
