import { APIGatewayEvent } from "aws-lambda";
import { z } from "zod";
import { toLMSResult } from "@libs/utils";

export function parseRegCompleteEvent(event: APIGatewayEvent) {
  const bodySchema = z.object({
    fe_public_key: z.string(),
    signed_challenge: z.string(),
    code_verifier: z.string(),
  });

  const eventSchema = z
    .object({
      body: z.string().transform((str) => JSON.parse(str)),
      pathParameters: z.object({
        transaction_id: z.string(),
      }),
      requestContext: z.object({
        authorizer: z.object({
          onmouuid: z.string(),
        }),
      }),
    })
    .transform((evt) => {
      const parsedBody = bodySchema.parse(evt.body);
      return {
        fePublicKey: parsedBody.fe_public_key,
        signedChallenge: parsedBody.signed_challenge,
        codeVerifier: parsedBody.code_verifier,
        transactionId: evt.pathParameters.transaction_id,
        onmoId: evt.requestContext.authorizer.onmouuid,
      };
    });

  return toLMSResult(eventSchema.safeParse(event), "biometrics-reg-complete event schema");
}
