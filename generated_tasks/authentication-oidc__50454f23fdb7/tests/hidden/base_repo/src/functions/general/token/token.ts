import { createApiHandler, APIGatewayProxyEvent } from "@onmoapp/handler-middleware";
import { authCodeRequest } from "./token.auth_code";
import { refreshTokenRequest } from "./token.refresh_token";

const token = async (event: APIGatewayProxyEvent) => {
  const body = event.body!;
  const { refresh_token } = JSON.parse(body);

  return refresh_token
    ? await refreshTokenRequest({ event: { ...event, body } })
    : await authCodeRequest({ event: { ...event, body } });
};

export const handler = createApiHandler<APIGatewayProxyEvent>(__HANDLER_NAME__).handle(token);
