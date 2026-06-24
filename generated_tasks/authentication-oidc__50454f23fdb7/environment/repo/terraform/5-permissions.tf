resource "aws_lambda_permission" "apiBroker" {
  depends_on = [module.authorizer, module.v2]

  function_name = module.authorizer.name
  qualifier     = module.v2.api_stage_lambda_alias
  statement_id  = "AllowExecutionFromAPIGateway-${local.common_config.gateways.API_BROKER_GATEWAY_ID}"
  action        = "lambda:InvokeFunction"
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${local.gateway_arn_api_broker}/*"
}

resource "aws_lambda_permission" "apr" {
  depends_on = [module.authorizer, module.v2]

  function_name = module.authorizer.name
  qualifier     = module.v2.api_stage_lambda_alias
  statement_id  = "AllowExecutionFromAPIGateway-${local.env_config.gateways.APR_GATEWAY_ID}"
  action        = "lambda:InvokeFunction"
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${local.gateway_arn_apr}/*"
}

resource "aws_lambda_permission" "apiBrokerV3" {
  depends_on = [module.authorizer, module.v3]

  function_name = module.authorizer.name
  qualifier     = module.v3.api_stage_lambda_alias
  statement_id  = "AllowExecutionFromAPIGateway-${local.common_config.gateways.API_BROKER_GATEWAY_ID}"
  action        = "lambda:InvokeFunction"
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${local.gateway_arn_api_broker}/*"
}

resource "aws_lambda_permission" "aprV3" {
  depends_on = [module.authorizer, module.v3]

  function_name = module.authorizer.name
  qualifier     = module.v3.api_stage_lambda_alias
  statement_id  = "AllowExecutionFromAPIGateway-${local.env_config.gateways.APR_GATEWAY_ID}"
  action        = "lambda:InvokeFunction"
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${local.gateway_arn_apr}/*"
}