terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "5.42.0"
    }
    datadog = {
      source  = "DataDog/datadog"
      version = "~> 3.42.0"
    }
  }

  backend "s3" {
    # .github/workflows/${ENVIRONMENT}.deploy.yaml
  }
}

provider "aws" {
  region = local.common_config.service.REGION

  default_tags {
    tags = {
      ManagedBy   = "Terraform",
      ServiceName = local.common_config.service.SERVICE_NAME,
      Environment = var.ENVIRONMENT,
      Owner       = "platform_team"
      OwnerEmail  = "engineering-team@onmo.app"
      Project     = "https://github.com/${var.GITHUB_REPO}"
    }
  }
}

provider "datadog" {
  api_key = var.DATADOG_API_KEY
  app_key = var.DATADOG_APP_KEY
  api_url = "https://api.datadoghq.eu"
}
