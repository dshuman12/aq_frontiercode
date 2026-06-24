module "service-monitor" {
  source            = "app.terraform.io/onmo/module-service-monitor/aws"
  version           = "~> 2.0"
  service_config    = local.service_config
  github_repository = var.GITHUB_REPO

  lambda_functions = [
    { name = module.authorizer.name },
    { name = module.token.name },
    { name = module.logout.name },
    { name = module.eligibility.name },
    { name = module.authorize.name },
    { name = module.sendOTP.name },
    { name = module.verifyOTP.name },
    { name = module.otp-passcode-authorize.name },
    { name = module.otp-passcode-sendOTP.name },
    { name = module.otp-passcode-resendOTP.name },
    { name = module.otp-passcode-verifyOTP.name },
    { name = module.otp-passcode-verifyPasscode.name },
    { name = module.biometrics-reg-initiate.name },
    { name = module.biometrics-reg-complete.name },
    { name = module.biometrics-authorize.name },
    { name = module.biometrics-verify.name },
    { name = module.extra-scope-authorize.name },
    { name = module.extra-scope-sendOTP.name },
    { name = module.extra-scope-resendOTP.name },
    { name = module.extra-scope-verifyOTP.name },
    { name = module.extra-scope-verifyPasscode.name },
    { name = module.extra-scope-verifyBiometrics.name },
    { name = module.forgot-pass-authorize-out.name },
    { name = module.forgot-pass-authorize-in.name },
    { name = module.forgot-pass-sendOTP.name },
    { name = module.forgot-pass-resendOTP.name },
    { name = module.forgot-pass-verifyOTP.name },
    { name = module.forgot-pass-sendEmail.name },
    { name = module.forgot-pass-resendEmail.name },
    { name = module.forgot-pass-redirect.name },
    { name = module.forgot-pass-verifyEmail.name },
    { name = module.changePasscode.name },
    { name = module.userInfo.name },
    { name = module.email-change-initiate.name },
    { name = module.email-change-redirect.name },
    { name = module.email-change-validate.name },
    { name = module.email-change-email-resend.name },
    { name = module.email-change-otp-resend.name },
    { name = module.phone-change-initiate.name },
    { name = module.phone-change-validate-otp.name },
    { name = module.phone-change-otp-resend.name },
    { name = module.phone-change-email-send.name },
    { name = module.phone-change-email-verify.name },
    { name = module.phone-change-email-redirect.name },
    { name = module.phone-change-email-resend.name },
  ]
  api_gateways = [{ name = module.rest_api_gateway.name }]

  notification_slack_channels = ["${var.SLACK_CHANNEL}"]
  monitor_configs = {
    api_latency = {
      enabled           = true
      threshold         = 15000
      time_window       = "last_1h"
      renotify_interval = 0
    }
    # Disabling lambda errors as they are not needed in production at the moment.
    lambda_errors = {
      enabled = false
    }
    # Disabling lambda duration as they are not needed in production at the moment.
    lambda_duration = {
      enabled = false
    }
    lambda_throttles = {
      enabled           = true
      threshold         = 5
      time_window       = "last_1h"
      renotify_interval = 0
    }
    api_5xx_errors = {
      enabled                = true
      threshold              = 1
      warning_threshold      = 0
      time_window            = "last_1h"
      baseline_request_count = 5
      renotify_interval      = 0
    }
    # Disabling 4xx errors as they are not needed in production at the moment.
    api_4xx_errors = {
      enabled = false
    }
  }
}


resource "datadog_monitor" "suspicious_activity_found_monitor" {
  name    = "Suspicious activity found:${var.ENVIRONMENT}-authentication-oidc"
  type    = "log alert"
  message = <<-EOT
  ***[${var.ENVIRONMENT}]*** ⚠️ Suspicious Activity Found

  ***Alert Details***:
  - ***Service:*** authentication-oidc
  - ***Environment:*** ${var.ENVIRONMENT}

  ***Description***:
  1. Suspicious activity detected in logs (e.g., modified API calls or token misuse).
  2. Triggered by entries tagged with [suspicious_activity].
  3. [View Logs](https://app.datadoghq.eu/logs?query=service%3A${var.ENVIRONMENT}-authentication-%2A%20-status%3Ainfo%20%22%5Bsuspicious_activity%5D%22&agg_m=count&agg_m_source=base&agg_q=service&agg_q_source=base&agg_t=count&clustering_pattern_field_path=message&cols=host%2Cservice&fromUser=true&messageDisplay=inline&refresh_mode=sliding&storage=hot&stream_sort=desc&top_n=10&top_o=top&viz=stream&live=true) for more details.

  ***Actions***:
  1. Check the logs and see how many attempts are failed, if seems critical report to the channel

  ***Notify***:
  ${join(", ", var.ALERT_EMAIL_LIST)},@slack-${var.SLACK_CHANNEL}
  EOT

  escalation_message = "Escalation message @slack-${var.SLACK_CHANNEL}"

  # Query that defines the condition for triggering the alert
  # - Logs are filtered for the service related to transactions-service-getAccountTransactions
  # - It checks the count of errors in the last 10 minutes and triggers if count > 1
  query = <<-EOT
    logs("service:${var.ENVIRONMENT}-authentication-* \"[suspicious_activity]\"")
    .index("main")
    .rollup("count")
    .last("30m") >= 50
  EOT

  # Thresholds for triggering the alert at different severity levels
  monitor_thresholds {
    critical = 50
  }

  priority = 3

  notify_no_data = false
  include_tags   = false

  tags = [
    "service:${var.SERVICE_NAME}",
    "env:${var.ENVIRONMENT}",
    "monitor_type:log alert",
    "resource:lambda",
    "managed_by:terraform",
    "project:${var.GITHUB_REPO}"
  ]
}