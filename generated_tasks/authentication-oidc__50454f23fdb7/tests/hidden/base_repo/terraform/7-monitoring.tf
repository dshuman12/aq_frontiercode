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

  notification_slack_channels = ["${local.env_config.alerting.SLACK_CHANNEL}"]
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


# ── Auth Flow Success Rate: Log-based Metrics ──────────────────────────────────

resource "datadog_logs_metric" "auth_flow_started" {
  count = var.ENVIRONMENT == "prod" ? 1 : 0
  name  = "authentication.flow.started"
  compute {
    aggregation_type = "count"
  }
  filter {
    query = "service:${var.ENVIRONMENT}-authentication-* @function_name:(otp-passcode-authorize OR biometrics-authorize OR extra-scope-authorize OR forgot-pass-authorize-in OR forgot-pass-authorize-out) @transaction_id:*"
  }
  group_by {
    path     = "@auth_flow"
    tag_name = "auth_flow"
  }
  group_by {
    path     = "@login_flow"
    tag_name = "login_flow"
  }
  group_by {
    path     = "env"
    tag_name = "env"
  }
}

resource "datadog_logs_metric" "auth_flow_completed" {
  count = var.ENVIRONMENT == "prod" ? 1 : 0
  name  = "authentication.flow.completed"
  compute {
    aggregation_type = "count"
  }
  filter {
    query = "service:${var.ENVIRONMENT}-authentication-* @function_name:token @request_type:auth_code @status_code:200 @transaction_id:*"
  }
  group_by {
    path     = "@auth_flow"
    tag_name = "auth_flow"
  }
  group_by {
    path     = "@login_flow"
    tag_name = "login_flow"
  }
  group_by {
    path     = "env"
    tag_name = "env"
  }
}

# ── Auth Flow Success Rate: Stale Transaction Monitor ───────────────────────────
# Uses transaction_id correlation to detect flows that started but never completed.

resource "datadog_monitor" "stale_auth_transactions" {
  count = var.ENVIRONMENT == "prod" ? 1 : 0
  name  = "Stale auth transactions:${var.ENVIRONMENT}-authentication-oidc"
  type  = "log alert"

  message = <<-EOT
  ***[${var.ENVIRONMENT}]*** Stale Auth Transactions Detected

  ***Alert Details***:
  - ***Service:*** authentication-oidc

  ***Description***:
  A high number of authentication transactions were started (authorize endpoint) but never reached the token endpoint within 15 minutes. This indicates either system failures mid-flow or a surge in user abandonment.

  ***Actions***:
  1. [View Stale Transaction Logs](https://app.datadoghq.eu/logs?query=service%3A${var.ENVIRONMENT}-authentication-%2A%20%40function_name%3A%28otp-passcode-authorize+OR+biometrics-authorize+OR+extra-scope-authorize+OR+forgot-pass-authorize-in+OR+forgot-pass-authorize-out%29%20%40transaction_id%3A%2A&agg_m=count&agg_m_source=base&agg_q=%40auth_flow&agg_q_source=base&agg_t=count&clustering_pattern_field_path=%40transaction_id&cols=host%2Cservice&fromUser=true&messageDisplay=inline&refresh_mode=sliding&storage=hot&stream_sort=desc&top_n=10&top_o=top&viz=stream&live=true) to trace specific transaction_ids that didn't complete
  2. Cross-reference with error_code logs to identify failure reasons
  3. Check for recent deployments or infrastructure changes

  ***Notify***:
  ${join(", ", local.env_config.alerting.ALERT_EMAIL_LIST)},@slack-${local.env_config.alerting.SLACK_CHANNEL}
  EOT

  query = <<-EOT
    logs("service:${var.ENVIRONMENT}-authentication-* @function_name:(otp-passcode-authorize OR biometrics-authorize OR extra-scope-authorize OR forgot-pass-authorize-in OR forgot-pass-authorize-out) @transaction_id:*")
    .index("main")
    .rollup("cardinality", "@transaction_id")
    .last("15m")
    -
    logs("service:${var.ENVIRONMENT}-authentication-* @function_name:token @request_type:auth_code @status_code:200 @transaction_id:*")
    .index("main")
    .rollup("cardinality", "@transaction_id")
    .last("15m")
    >= ${var.STALE_TRANSACTION_THRESHOLD}
  EOT

  monitor_thresholds {
    critical = var.STALE_TRANSACTION_THRESHOLD
    warning  = var.STALE_TRANSACTION_WARNING_THRESHOLD
  }

  priority       = 3
  notify_no_data = false
  include_tags   = true

  tags = [
    "service:${local.common_config.service.SERVICE_NAME}",
    "env:${var.ENVIRONMENT}",
    "monitor_type:log alert",
    "managed_by:terraform",
    "project:${var.GITHUB_REPO}"
  ]
}

# ── Auth Flow Success Rate: Monitors ───────────────────────────────────────────

resource "datadog_monitor" "relogin_success_rate" {
  count = var.ENVIRONMENT == "prod" ? 1 : 0
  name  = "Relogin success rate low:${var.ENVIRONMENT}-authentication-oidc"
  type  = "metric alert"

  message = <<-EOT
  ***[${var.ENVIRONMENT}]*** Relogin Success Rate Below Threshold

  ***Alert Details***:
  - ***Flow:*** OTP Passcode / Relogin
  - ***Service:*** authentication-oidc

  ***Description***:
  The ratio of completed token requests to started OTP passcode authorize requests for the relogin flow has dropped below the threshold. This means users are failing to complete the OTP passcode relogin flow after starting it. Note: biometric relogins are tracked separately by the biometrics success rate monitor.

  ***Actions***:
  1. [View Error Logs](https://app.datadoghq.eu/logs?query=service%3A${var.ENVIRONMENT}-authentication-%2A%20%40login_flow%3Arelogin%20%40error_code%3A%2A&agg_m=count&agg_m_source=base&agg_q=%40error_code&agg_q_source=base&agg_t=count&clustering_pattern_field_path=message&cols=host%2Cservice&fromUser=true&messageDisplay=inline&refresh_mode=sliding&storage=hot&stream_sort=desc&top_n=10&top_o=top&viz=stream&live=true) to see which error codes are causing failures
  2. Check for recent deployments or infrastructure changes

  ***Notify***:
  ${join(", ", local.env_config.alerting.ALERT_EMAIL_LIST)},@slack-${local.env_config.alerting.SLACK_CHANNEL}
  EOT

  query = "avg(last_15m):(sum:authentication.flow.completed{env:${var.ENVIRONMENT},auth_flow:otp_passcode,login_flow:relogin} / sum:authentication.flow.started{env:${var.ENVIRONMENT},auth_flow:otp_passcode,login_flow:relogin}) < ${var.AUTH_FLOW_SUCCESS_RATE_CRITICAL}"

  monitor_thresholds {
    critical = var.AUTH_FLOW_SUCCESS_RATE_CRITICAL
    warning  = var.AUTH_FLOW_SUCCESS_RATE_WARNING
  }

  priority       = 3
  notify_no_data = false
  include_tags   = true

  tags = [
    "service:${local.common_config.service.SERVICE_NAME}",
    "env:${var.ENVIRONMENT}",
    "monitor_type:metric alert",
    "auth_flow:otp_passcode",
    "login_flow:relogin",
    "managed_by:terraform",
    "project:${var.GITHUB_REPO}"
  ]
}

resource "datadog_monitor" "first_time_login_success_rate" {
  count = var.ENVIRONMENT == "prod" ? 1 : 0
  name  = "First-time login success rate low:${var.ENVIRONMENT}-authentication-oidc"
  type  = "metric alert"

  message = <<-EOT
  ***[${var.ENVIRONMENT}]*** First-time Login Success Rate Below Threshold

  ***Alert Details***:
  - ***Flow:*** OTP Passcode / First-time Login
  - ***Service:*** authentication-oidc

  ***Description***:
  The ratio of completed token requests to started authorize requests for the first-time login flow has dropped below the threshold. This means users are failing to complete the first-time login flow after starting it.

  ***Actions***:
  1. [View Error Logs](https://app.datadoghq.eu/logs?query=service%3A${var.ENVIRONMENT}-authentication-%2A%20%40login_flow%3Afirst_time_login%20%40error_code%3A%2A&agg_m=count&agg_m_source=base&agg_q=%40error_code&agg_q_source=base&agg_t=count&clustering_pattern_field_path=message&cols=host%2Cservice&fromUser=true&messageDisplay=inline&refresh_mode=sliding&storage=hot&stream_sort=desc&top_n=10&top_o=top&viz=stream&live=true) to see which error codes are causing failures
  2. Check for recent deployments or infrastructure changes

  ***Notify***:
  ${join(", ", local.env_config.alerting.ALERT_EMAIL_LIST)},@slack-${local.env_config.alerting.SLACK_CHANNEL}
  EOT

  query = "avg(last_15m):(sum:authentication.flow.completed{env:${var.ENVIRONMENT},auth_flow:otp_passcode,login_flow:first_time_login} / sum:authentication.flow.started{env:${var.ENVIRONMENT},login_flow:first_time_login}) < ${var.AUTH_FLOW_SUCCESS_RATE_CRITICAL}"

  monitor_thresholds {
    critical = var.AUTH_FLOW_SUCCESS_RATE_CRITICAL
    warning  = var.AUTH_FLOW_SUCCESS_RATE_WARNING
  }

  priority       = 3
  notify_no_data = false
  include_tags   = true

  tags = [
    "service:${local.common_config.service.SERVICE_NAME}",
    "env:${var.ENVIRONMENT}",
    "monitor_type:metric alert",
    "auth_flow:otp_passcode",
    "login_flow:first_time_login",
    "managed_by:terraform",
    "project:${var.GITHUB_REPO}"
  ]
}

resource "datadog_monitor" "biometrics_success_rate" {
  count = var.ENVIRONMENT == "prod" ? 1 : 0
  name  = "Biometrics auth success rate low:${var.ENVIRONMENT}-authentication-oidc"
  type  = "metric alert"

  message = <<-EOT
  ***[${var.ENVIRONMENT}]*** Biometrics Auth Success Rate Below Threshold

  ***Alert Details***:
  - ***Flow:*** Biometrics
  - ***Service:*** authentication-oidc

  ***Description***:
  The ratio of completed token requests to started authorize requests for the biometrics flow has dropped below the threshold.

  ***Actions***:
  1. [View Error Logs](https://app.datadoghq.eu/logs?query=service%3A${var.ENVIRONMENT}-authentication-%2A%20%40auth_flow%3Abiometrics%20%40error_code%3A%2A&agg_m=count&agg_m_source=base&agg_q=%40error_code&agg_q_source=base&agg_t=count&clustering_pattern_field_path=message&cols=host%2Cservice&fromUser=true&messageDisplay=inline&refresh_mode=sliding&storage=hot&stream_sort=desc&top_n=10&top_o=top&viz=stream&live=true) to see which error codes are causing failures
  2. Check for recent deployments or infrastructure changes

  ***Notify***:
  ${join(", ", local.env_config.alerting.ALERT_EMAIL_LIST)},@slack-${local.env_config.alerting.SLACK_CHANNEL}
  EOT

  query = "avg(last_15m):(sum:authentication.flow.completed{env:${var.ENVIRONMENT},auth_flow:biometrics} / sum:authentication.flow.started{env:${var.ENVIRONMENT},auth_flow:biometrics}) < ${var.AUTH_FLOW_SUCCESS_RATE_CRITICAL}"

  monitor_thresholds {
    critical = var.AUTH_FLOW_SUCCESS_RATE_CRITICAL
    warning  = var.AUTH_FLOW_SUCCESS_RATE_WARNING
  }

  priority       = 3
  notify_no_data = false
  include_tags   = true

  tags = [
    "service:${local.common_config.service.SERVICE_NAME}",
    "env:${var.ENVIRONMENT}",
    "monitor_type:metric alert",
    "auth_flow:biometrics",
    "managed_by:terraform",
    "project:${var.GITHUB_REPO}"
  ]
}

resource "datadog_monitor" "extra_scope_success_rate" {
  count = var.ENVIRONMENT == "prod" ? 1 : 0
  name  = "Extra scope auth success rate low:${var.ENVIRONMENT}-authentication-oidc"
  type  = "metric alert"

  message = <<-EOT
  ***[${var.ENVIRONMENT}]*** Extra Scope Auth Success Rate Below Threshold

  ***Alert Details***:
  - ***Flow:*** Extra Scope
  - ***Service:*** authentication-oidc

  ***Description***:
  The ratio of completed token requests to started authorize requests for the extra scope flow has dropped below the threshold.

  ***Actions***:
  1. [View Error Logs](https://app.datadoghq.eu/logs?query=service%3A${var.ENVIRONMENT}-authentication-%2A%20%40auth_flow%3Aextra_scope%20%40error_code%3A%2A&agg_m=count&agg_m_source=base&agg_q=%40error_code&agg_q_source=base&agg_t=count&clustering_pattern_field_path=message&cols=host%2Cservice&fromUser=true&messageDisplay=inline&refresh_mode=sliding&storage=hot&stream_sort=desc&top_n=10&top_o=top&viz=stream&live=true) to see which error codes are causing failures
  2. Check for recent deployments or infrastructure changes

  ***Notify***:
  ${join(", ", local.env_config.alerting.ALERT_EMAIL_LIST)},@slack-${local.env_config.alerting.SLACK_CHANNEL}
  EOT

  query = "avg(last_15m):(sum:authentication.flow.completed{env:${var.ENVIRONMENT},auth_flow:extra_scope} / sum:authentication.flow.started{env:${var.ENVIRONMENT},auth_flow:extra_scope}) < ${var.AUTH_FLOW_SUCCESS_RATE_CRITICAL}"

  monitor_thresholds {
    critical = var.AUTH_FLOW_SUCCESS_RATE_CRITICAL
    warning  = var.AUTH_FLOW_SUCCESS_RATE_WARNING
  }

  priority       = 3
  notify_no_data = false
  include_tags   = true

  tags = [
    "service:${local.common_config.service.SERVICE_NAME}",
    "env:${var.ENVIRONMENT}",
    "monitor_type:metric alert",
    "auth_flow:extra_scope",
    "managed_by:terraform",
    "project:${var.GITHUB_REPO}"
  ]
}

resource "datadog_monitor" "forgotten_passcode_logged_in_success_rate" {
  count = var.ENVIRONMENT == "prod" ? 1 : 0
  name  = "Forgotten passcode (logged in) success rate low:${var.ENVIRONMENT}-authentication-oidc"
  type  = "metric alert"

  message = <<-EOT
  ***[${var.ENVIRONMENT}]*** Forgotten Passcode (Logged In) Success Rate Below Threshold

  ***Alert Details***:
  - ***Flow:*** Forgotten Passcode / Logged In
  - ***Service:*** authentication-oidc

  ***Description***:
  The ratio of completed token requests to started authorize requests for the forgotten passcode (logged in) flow has dropped below the threshold.

  ***Actions***:
  1. [View Error Logs](https://app.datadoghq.eu/logs?query=service%3A${var.ENVIRONMENT}-authentication-%2A%20%40auth_flow%3Aforgotten_passcode_logged_in%20%40error_code%3A%2A&agg_m=count&agg_m_source=base&agg_q=%40error_code&agg_q_source=base&agg_t=count&clustering_pattern_field_path=message&cols=host%2Cservice&fromUser=true&messageDisplay=inline&refresh_mode=sliding&storage=hot&stream_sort=desc&top_n=10&top_o=top&viz=stream&live=true) to see which error codes are causing failures
  2. Check for recent deployments or infrastructure changes

  ***Notify***:
  ${join(", ", local.env_config.alerting.ALERT_EMAIL_LIST)},@slack-${local.env_config.alerting.SLACK_CHANNEL}
  EOT

  query = "avg(last_15m):(sum:authentication.flow.completed{env:${var.ENVIRONMENT},auth_flow:forgotten_passcode_logged_in} / sum:authentication.flow.started{env:${var.ENVIRONMENT},auth_flow:forgotten_passcode_logged_in}) < ${var.AUTH_FLOW_SUCCESS_RATE_CRITICAL}"

  monitor_thresholds {
    critical = var.AUTH_FLOW_SUCCESS_RATE_CRITICAL
    warning  = var.AUTH_FLOW_SUCCESS_RATE_WARNING
  }

  priority       = 3
  notify_no_data = false
  include_tags   = true

  tags = [
    "service:${local.common_config.service.SERVICE_NAME}",
    "env:${var.ENVIRONMENT}",
    "monitor_type:metric alert",
    "auth_flow:forgotten_passcode_logged_in",
    "managed_by:terraform",
    "project:${var.GITHUB_REPO}"
  ]
}

resource "datadog_monitor" "forgotten_passcode_logged_out_success_rate" {
  count = var.ENVIRONMENT == "prod" ? 1 : 0
  name  = "Forgotten passcode (logged out) success rate low:${var.ENVIRONMENT}-authentication-oidc"
  type  = "metric alert"

  message = <<-EOT
  ***[${var.ENVIRONMENT}]*** Forgotten Passcode (Logged Out) Success Rate Below Threshold

  ***Alert Details***:
  - ***Flow:*** Forgotten Passcode / Logged Out
  - ***Service:*** authentication-oidc

  ***Description***:
  The ratio of completed token requests to started authorize requests for the forgotten passcode (logged out) flow has dropped below the threshold.

  ***Actions***:
  1. [View Error Logs](https://app.datadoghq.eu/logs?query=service%3A${var.ENVIRONMENT}-authentication-%2A%20%40auth_flow%3Aforgotten_passcode_logged_out%20%40error_code%3A%2A&agg_m=count&agg_m_source=base&agg_q=%40error_code&agg_q_source=base&agg_t=count&clustering_pattern_field_path=message&cols=host%2Cservice&fromUser=true&messageDisplay=inline&refresh_mode=sliding&storage=hot&stream_sort=desc&top_n=10&top_o=top&viz=stream&live=true) to see which error codes are causing failures
  2. Check for recent deployments or infrastructure changes

  ***Notify***:
  ${join(", ", local.env_config.alerting.ALERT_EMAIL_LIST)},@slack-${local.env_config.alerting.SLACK_CHANNEL}
  EOT

  query = "avg(last_15m):(sum:authentication.flow.completed{env:${var.ENVIRONMENT},auth_flow:forgotten_passcode_logged_out} / sum:authentication.flow.started{env:${var.ENVIRONMENT},auth_flow:forgotten_passcode_logged_out}) < ${var.AUTH_FLOW_SUCCESS_RATE_CRITICAL}"

  monitor_thresholds {
    critical = var.AUTH_FLOW_SUCCESS_RATE_CRITICAL
    warning  = var.AUTH_FLOW_SUCCESS_RATE_WARNING
  }

  priority       = 3
  notify_no_data = false
  include_tags   = true

  tags = [
    "service:${local.common_config.service.SERVICE_NAME}",
    "env:${var.ENVIRONMENT}",
    "monitor_type:metric alert",
    "auth_flow:forgotten_passcode_logged_out",
    "managed_by:terraform",
    "project:${var.GITHUB_REPO}"
  ]
}

resource "datadog_monitor" "otp_passcode_success_rate" {
  count = var.ENVIRONMENT == "prod" ? 1 : 0
  name  = "OTP passcode auth success rate low:${var.ENVIRONMENT}-authentication-oidc"
  type  = "metric alert"

  message = <<-EOT
  ***[${var.ENVIRONMENT}]*** OTP Passcode Auth Success Rate Below Threshold

  ***Alert Details***:
  - ***Flow:*** OTP Passcode (aggregate of relogin + first-time login)
  - ***Service:*** authentication-oidc

  ***Description***:
  The ratio of completed token requests to started authorize requests for the OTP passcode flow (all login flows combined) has dropped below the threshold.

  ***Actions***:
  1. [View Error Logs](https://app.datadoghq.eu/logs?query=service%3A${var.ENVIRONMENT}-authentication-%2A%20%40auth_flow%3Aotp_passcode%20%40error_code%3A%2A&agg_m=count&agg_m_source=base&agg_q=%40error_code&agg_q_source=base&agg_t=count&clustering_pattern_field_path=message&cols=host%2Cservice&fromUser=true&messageDisplay=inline&refresh_mode=sliding&storage=hot&stream_sort=desc&top_n=10&top_o=top&viz=stream&live=true) to see which error codes are causing failures
  2. Check the relogin and first-time login monitors for more specific breakdown
  3. Check for recent deployments or infrastructure changes

  ***Notify***:
  ${join(", ", local.env_config.alerting.ALERT_EMAIL_LIST)},@slack-${local.env_config.alerting.SLACK_CHANNEL}
  EOT

  query = "avg(last_15m):(sum:authentication.flow.completed{env:${var.ENVIRONMENT},auth_flow:otp_passcode} / sum:authentication.flow.started{env:${var.ENVIRONMENT},auth_flow:otp_passcode}) < ${var.AUTH_FLOW_SUCCESS_RATE_CRITICAL}"

  monitor_thresholds {
    critical = var.AUTH_FLOW_SUCCESS_RATE_CRITICAL
    warning  = var.AUTH_FLOW_SUCCESS_RATE_WARNING
  }

  priority       = 3
  notify_no_data = false
  include_tags   = true

  tags = [
    "service:${local.common_config.service.SERVICE_NAME}",
    "env:${var.ENVIRONMENT}",
    "monitor_type:metric alert",
    "auth_flow:otp_passcode",
    "managed_by:terraform",
    "project:${var.GITHUB_REPO}"
  ]
}

# ── Auth Flow Success Rate: Dashboard ──────────────────────────────────────────

resource "datadog_dashboard" "auth_flow_success_rates" {
  count       = var.ENVIRONMENT == "prod" ? 1 : 0
  title       = "Auth Flow Success Rates: ${var.ENVIRONMENT}"
  description = "Authentication flow success rates (authorize -> token completion) by auth_flow and login_flow"
  layout_type = "ordered"

  widget {
    group_definition {
      title       = "Flow Volume (last 24h)"
      layout_type = "ordered"

      widget {
        note_definition {
          content          = "Total authentication flows **initiated** in the last 24 hours, by flow type. Use these counts as context before interpreting the success rate charts below — a low number here means the percentages may be statistically noisy."
          background_color = "blue"
          font_size        = "14"
          text_align       = "left"
          show_tick        = false
        }
      }

      widget {
        query_value_definition {
          title     = "Relogin (OTP Passcode)"
          autoscale = true
          precision = 0
          live_span = "1d"
          request {
            q          = "sum:authentication.flow.started{env:${var.ENVIRONMENT},auth_flow:otp_passcode,login_flow:relogin}.as_count()"
            aggregator = "sum"
          }
        }
      }

      widget {
        query_value_definition {
          title     = "First-time Login"
          autoscale = true
          precision = 0
          live_span = "1d"
          request {
            q          = "sum:authentication.flow.started{env:${var.ENVIRONMENT},login_flow:first_time_login}.as_count()"
            aggregator = "sum"
          }
        }
      }

      widget {
        query_value_definition {
          title     = "Biometrics"
          autoscale = true
          precision = 0
          live_span = "1d"
          request {
            q          = "sum:authentication.flow.started{env:${var.ENVIRONMENT},auth_flow:biometrics}.as_count()"
            aggregator = "sum"
          }
        }
      }

      widget {
        query_value_definition {
          title     = "Extra Scope"
          autoscale = true
          precision = 0
          live_span = "1d"
          request {
            q          = "sum:authentication.flow.started{env:${var.ENVIRONMENT},auth_flow:extra_scope}.as_count()"
            aggregator = "sum"
          }
        }
      }

      widget {
        query_value_definition {
          title     = "Forgotten Passcode"
          autoscale = true
          precision = 0
          live_span = "1d"
          request {
            q          = "sum:authentication.flow.started{env:${var.ENVIRONMENT},auth_flow:forgotten_passcode_logged_in}.as_count() + sum:authentication.flow.started{env:${var.ENVIRONMENT},auth_flow:forgotten_passcode_logged_out}.as_count()"
            aggregator = "sum"
          }
        }
      }
    }
  }

  widget {
    group_definition {
      title       = "Login Flow Success Rates"
      layout_type = "ordered"

      widget {
        note_definition {
          content          = "OTP passcode flows split by login type. **Bar charts**: blue = flows started, orange = flows that reached a token — a widening gap means users are dropping off. **Percentage tiles**: rolling 15-minute completion rate. 🟢 ≥90% healthy · 🟡 >85% degraded · 🔴 ≤85% critical and will trigger an alert."
          background_color = "blue"
          font_size        = "14"
          text_align       = "left"
          show_tick        = false
        }
      }

      widget {
        timeseries_definition {
          title       = "Relogin: Started vs Completed"
          show_legend = true

          request {
            display_type   = "bars"
            on_right_yaxis = false
            style {
              palette    = "cool"
              line_width = "normal"
            }

            q = "sum:authentication.flow.started{env:${var.ENVIRONMENT},auth_flow:otp_passcode,login_flow:relogin}.as_count()"
            metadata {
              expression = "sum:authentication.flow.started{env:${var.ENVIRONMENT},auth_flow:otp_passcode,login_flow:relogin}.as_count()"
              alias_name = "Started"
            }
          }
          request {
            display_type   = "bars"
            on_right_yaxis = false
            style {
              palette    = "warm"
              line_width = "normal"
            }

            q = "sum:authentication.flow.completed{env:${var.ENVIRONMENT},auth_flow:otp_passcode,login_flow:relogin}.as_count()"
            metadata {
              expression = "sum:authentication.flow.completed{env:${var.ENVIRONMENT},auth_flow:otp_passcode,login_flow:relogin}.as_count()"
              alias_name = "Completed"
            }
          }
        }
      }

      widget {
        timeseries_definition {
          title       = "First-time Login: Started vs Completed"
          show_legend = true

          request {
            display_type   = "bars"
            on_right_yaxis = false
            style {
              palette    = "cool"
              line_width = "normal"
            }

            q = "sum:authentication.flow.started{env:${var.ENVIRONMENT},login_flow:first_time_login}.as_count()"
            metadata {
              expression = "sum:authentication.flow.started{env:${var.ENVIRONMENT},login_flow:first_time_login}.as_count()"
              alias_name = "Started"
            }
          }
          request {
            display_type   = "bars"
            on_right_yaxis = false
            style {
              palette    = "warm"
              line_width = "normal"
            }

            q = "sum:authentication.flow.completed{env:${var.ENVIRONMENT},auth_flow:otp_passcode,login_flow:first_time_login}.as_count()"
            metadata {
              expression = "sum:authentication.flow.completed{env:${var.ENVIRONMENT},auth_flow:otp_passcode,login_flow:first_time_login}.as_count()"
              alias_name = "Completed"
            }
          }
        }
      }

      widget {
        query_value_definition {
          title       = "Relogin Success Rate (15m)"
          autoscale   = false
          custom_unit = "%"
          precision   = 1
          request {
            q = "(sum:authentication.flow.completed{env:${var.ENVIRONMENT},auth_flow:otp_passcode,login_flow:relogin}.as_count()/sum:authentication.flow.started{env:${var.ENVIRONMENT},auth_flow:otp_passcode,login_flow:relogin}.as_count())*100"
            conditional_formats {
              comparator = ">="
              value      = "90"
              palette    = "green"
            }
            conditional_formats {
              comparator = ">"
              value      = "85"
              palette    = "white_on_yellow"
            }
            conditional_formats {
              comparator = "<="
              value      = "85"
              palette    = "red"
            }
          }
        }
      }

      widget {
        query_value_definition {
          title       = "First-time Login Success Rate (15m)"
          autoscale   = false
          custom_unit = "%"
          precision   = 1
          request {
            q = "(sum:authentication.flow.completed{env:${var.ENVIRONMENT},auth_flow:otp_passcode,login_flow:first_time_login}.as_count()/sum:authentication.flow.started{env:${var.ENVIRONMENT},login_flow:first_time_login}.as_count())*100"
            conditional_formats {
              comparator = ">="
              value      = "90"
              palette    = "green"
            }
            conditional_formats {
              comparator = ">"
              value      = "85"
              palette    = "white_on_yellow"
            }
            conditional_formats {
              comparator = "<="
              value      = "85"
              palette    = "red"
            }
          }
        }
      }
    }
  }

  widget {
    group_definition {
      title       = "Auth Flow Success Rates"
      layout_type = "ordered"

      widget {
        note_definition {
          content          = "Success rates for biometrics, extra scope, and forgotten passcode flows. **Bar charts**: blue = flows started, orange = flows completed — a gap indicates failures. **Percentage tiles**: rolling 15-minute completion rate. 🟢 ≥90% healthy · 🟡 >85% degraded · 🔴 ≤85% critical."
          background_color = "blue"
          font_size        = "14"
          text_align       = "left"
          show_tick        = false
        }
      }

      widget {
        timeseries_definition {
          title       = "Biometrics: Started vs Completed"
          show_legend = true

          request {
            display_type   = "bars"
            on_right_yaxis = false
            style {
              palette    = "cool"
              line_width = "normal"
            }

            q = "sum:authentication.flow.started{env:${var.ENVIRONMENT},auth_flow:biometrics}.as_count()"
            metadata {
              expression = "sum:authentication.flow.started{env:${var.ENVIRONMENT},auth_flow:biometrics}.as_count()"
              alias_name = "Started"
            }
          }
          request {
            display_type   = "bars"
            on_right_yaxis = false
            style {
              palette    = "warm"
              line_width = "normal"
            }

            q = "sum:authentication.flow.completed{env:${var.ENVIRONMENT},auth_flow:biometrics}.as_count()"
            metadata {
              expression = "sum:authentication.flow.completed{env:${var.ENVIRONMENT},auth_flow:biometrics}.as_count()"
              alias_name = "Completed"
            }
          }
        }
      }

      widget {
        timeseries_definition {
          title       = "Extra Scope: Started vs Completed"
          show_legend = true

          request {
            display_type   = "bars"
            on_right_yaxis = false
            style {
              palette    = "cool"
              line_width = "normal"
            }

            q = "sum:authentication.flow.started{env:${var.ENVIRONMENT},auth_flow:extra_scope}.as_count()"
            metadata {
              expression = "sum:authentication.flow.started{env:${var.ENVIRONMENT},auth_flow:extra_scope}.as_count()"
              alias_name = "Started"
            }
          }
          request {
            display_type   = "bars"
            on_right_yaxis = false
            style {
              palette    = "warm"
              line_width = "normal"
            }

            q = "sum:authentication.flow.completed{env:${var.ENVIRONMENT},auth_flow:extra_scope}.as_count()"
            metadata {
              expression = "sum:authentication.flow.completed{env:${var.ENVIRONMENT},auth_flow:extra_scope}.as_count()"
              alias_name = "Completed"
            }
          }
        }
      }

      widget {
        timeseries_definition {
          title       = "Forgotten Passcode (Logged In): Started vs Completed"
          show_legend = true

          request {
            display_type   = "bars"
            on_right_yaxis = false
            style {
              palette    = "cool"
              line_width = "normal"
            }

            q = "sum:authentication.flow.started{env:${var.ENVIRONMENT},auth_flow:forgotten_passcode_logged_in}.as_count()"
            metadata {
              expression = "sum:authentication.flow.started{env:${var.ENVIRONMENT},auth_flow:forgotten_passcode_logged_in}.as_count()"
              alias_name = "Started"
            }
          }
          request {
            display_type   = "bars"
            on_right_yaxis = false
            style {
              palette    = "warm"
              line_width = "normal"
            }

            q = "sum:authentication.flow.completed{env:${var.ENVIRONMENT},auth_flow:forgotten_passcode_logged_in}.as_count()"
            metadata {
              expression = "sum:authentication.flow.completed{env:${var.ENVIRONMENT},auth_flow:forgotten_passcode_logged_in}.as_count()"
              alias_name = "Completed"
            }
          }
        }
      }

      widget {
        timeseries_definition {
          title       = "Forgotten Passcode (Logged Out): Started vs Completed"
          show_legend = true

          request {
            display_type   = "bars"
            on_right_yaxis = false
            style {
              palette    = "cool"
              line_width = "normal"
            }

            q = "sum:authentication.flow.started{env:${var.ENVIRONMENT},auth_flow:forgotten_passcode_logged_out}.as_count()"
            metadata {
              expression = "sum:authentication.flow.started{env:${var.ENVIRONMENT},auth_flow:forgotten_passcode_logged_out}.as_count()"
              alias_name = "Started"
            }
          }
          request {
            display_type   = "bars"
            on_right_yaxis = false
            style {
              palette    = "warm"
              line_width = "normal"
            }

            q = "sum:authentication.flow.completed{env:${var.ENVIRONMENT},auth_flow:forgotten_passcode_logged_out}.as_count()"
            metadata {
              expression = "sum:authentication.flow.completed{env:${var.ENVIRONMENT},auth_flow:forgotten_passcode_logged_out}.as_count()"
              alias_name = "Completed"
            }
          }
        }
      }

      widget {
        query_value_definition {
          title       = "Biometrics Success Rate (15m)"
          autoscale   = false
          custom_unit = "%"
          precision   = 1
          request {
            q = "(sum:authentication.flow.completed{env:${var.ENVIRONMENT},auth_flow:biometrics}.as_count()/sum:authentication.flow.started{env:${var.ENVIRONMENT},auth_flow:biometrics}.as_count())*100"
            conditional_formats {
              comparator = ">="
              value      = "90"
              palette    = "green"
            }
            conditional_formats {
              comparator = ">"
              value      = "85"
              palette    = "white_on_yellow"
            }
            conditional_formats {
              comparator = "<="
              value      = "85"
              palette    = "red"
            }
          }
        }
      }

      widget {
        query_value_definition {
          title       = "Extra Scope Success Rate (15m)"
          autoscale   = false
          custom_unit = "%"
          precision   = 1
          request {
            q = "(sum:authentication.flow.completed{env:${var.ENVIRONMENT},auth_flow:extra_scope}.as_count()/sum:authentication.flow.started{env:${var.ENVIRONMENT},auth_flow:extra_scope}.as_count())*100"
            conditional_formats {
              comparator = ">="
              value      = "90"
              palette    = "green"
            }
            conditional_formats {
              comparator = ">"
              value      = "85"
              palette    = "white_on_yellow"
            }
            conditional_formats {
              comparator = "<="
              value      = "85"
              palette    = "red"
            }
          }
        }
      }
    }
  }

  widget {
    group_definition {
      title       = "Error Analysis (last 24h)"
      layout_type = "ordered"

      widget {
        note_definition {
          content          = "Breakdown of authentication errors. **Top Errors** ranks error codes by total occurrences — start here to identify what is breaking. **Errors Over Time** shows when errors occurred by flow, helping correlate spikes with deployments or incidents. **Recent Error Logs** lets you drill into individual failing requests for full context."
          background_color = "pink"
          font_size        = "14"
          text_align       = "left"
          show_tick        = false
        }
      }

      widget {
        toplist_definition {
          title = "Top Error Codes by Frequency"
          request {
            log_query {
              index        = "*"
              search_query = "service:${var.ENVIRONMENT}-authentication-* @error_code:*"
              group_by {
                facet = "@error_code"
                limit = 10
                sort_query {
                  aggregation = "count"
                  order       = "desc"
                }
              }
              compute_query {
                aggregation = "count"
              }
            }
          }
        }
      }

      widget {
        timeseries_definition {
          title       = "Errors Over Time by Auth Flow"
          show_legend = true
          request {
            display_type = "bars"
            log_query {
              index        = "*"
              search_query = "service:${var.ENVIRONMENT}-authentication-* @error_code:*"
              group_by {
                facet = "@auth_flow"
                limit = 10
                sort_query {
                  aggregation = "count"
                  order       = "desc"
                }
              }
              compute_query {
                aggregation = "count"
              }
            }
          }
        }
      }

      widget {
        log_stream_definition {
          title     = "Recent Error Log Entries"
          query     = "service:${var.ENVIRONMENT}-authentication-* @error_code:* -status:info"
          columns   = ["@auth_flow", "@login_flow", "@error_code", "@status_code", "message"]
          live_span = "1d"
        }
      }
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
  ${join(", ", local.env_config.alerting.ALERT_EMAIL_LIST)},@slack-${local.env_config.alerting.SLACK_CHANNEL}
  EOT

  escalation_message = "Escalation message @slack-${local.env_config.alerting.SLACK_CHANNEL}"

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
    "service:${local.common_config.service.SERVICE_NAME}",
    "env:${var.ENVIRONMENT}",
    "monitor_type:log alert",
    "resource:lambda",
    "managed_by:terraform",
    "project:${var.GITHUB_REPO}"
  ]
}
