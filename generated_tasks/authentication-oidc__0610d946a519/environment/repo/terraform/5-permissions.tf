resource "aws_lambda_permission" "apiBroker" {
  depends_on = [module.authorizer, module.v2]

  function_name = module.authorizer.name
  qualifier     = module.v2.api_stage_lambda_alias
  statement_id  = "AllowExecutionFromAPIGateway-${var.API_BROKER_GATEWAY_ID}"
  action        = "lambda:InvokeFunction"
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${local.gateway_prefix}:${var.API_BROKER_GATEWAY_ID}/*"
}

resource "aws_lambda_permission" "apr" {
  depends_on = [module.authorizer, module.v2]

  function_name = module.authorizer.name
  qualifier     = module.v2.api_stage_lambda_alias
  statement_id  = "AllowExecutionFromAPIGateway-${var.APR_GATEWAY_ID}"
  action        = "lambda:InvokeFunction"
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${local.gateway_prefix}:${var.APR_GATEWAY_ID}/*"
}

resource "aws_lambda_permission" "apiBrokerV3" {
  depends_on = [module.authorizer, module.v3]

  function_name = module.authorizer.name
  qualifier     = module.v3.api_stage_lambda_alias
  statement_id  = "AllowExecutionFromAPIGateway-${var.API_BROKER_GATEWAY_ID}"
  action        = "lambda:InvokeFunction"
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${local.gateway_prefix}:${var.API_BROKER_GATEWAY_ID}/*"
}

resource "aws_lambda_permission" "aprV3" {
  depends_on = [module.authorizer, module.v3]

  function_name = module.authorizer.name
  qualifier     = module.v3.api_stage_lambda_alias
  statement_id  = "AllowExecutionFromAPIGateway-${var.APR_GATEWAY_ID}"
  action        = "lambda:InvokeFunction"
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${local.gateway_prefix}:${var.APR_GATEWAY_ID}/*"
}