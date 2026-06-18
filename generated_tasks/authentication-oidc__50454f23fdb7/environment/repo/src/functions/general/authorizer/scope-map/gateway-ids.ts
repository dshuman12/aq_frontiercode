import { jsonString } from "@libs/parsedBody";
import { z } from "zod";
import { externalGatewayKeySchema, type ExternalGatewayKey } from "./types";

/**
 * Map of `ExternalGatewayKey` → AWS API Gateway id, resolved at
 * Terraform apply time by `local.gateway_ids` in
 * `terraform/9-external-scopes.tf` and injected into the Lambda as the
 * `GATEWAY_IDS` env var (JSON object, ~300 bytes).
 *
 * The authentication gateway is intentionally absent — see `./types.ts`.
 *
 * Schema-validated at module load with the same Zod enum that produces
 * `ExternalGatewayKey`, so adding a gateway in `types.ts` also requires
 * Terraform to inject it — missing or extra keys fail the Lambda init
 * with a descriptive error, which trips the standard CloudWatch Lambda
 * error alarm instead of silently denying every scoped request (an
 * `undefined` id spliced into an ARN pattern would never match).
 */
const gatewayIdMapSchema = z.strictObject(
  Object.fromEntries(
    externalGatewayKeySchema.options.map((key) => [key, z.string().min(1)]),
  ) as Record<ExternalGatewayKey, z.ZodString>,
);

export type GatewayIdMap = z.infer<typeof gatewayIdMapSchema>;

const result = jsonString(gatewayIdMapSchema, {
  missingMessage:
    "GATEWAY_IDS env var missing — Terraform should inject it via the authorizer module's environment_variables block (see terraform/2-functions.tf and terraform/9-external-scopes.tf).",
}).safeParse(process.env.GATEWAY_IDS);

if (!result.success) {
  throw new Error(`GATEWAY_IDS failed validation: ${z.prettifyError(result.error)}`);
}

export const gatewayIds: GatewayIdMap = result.data;
