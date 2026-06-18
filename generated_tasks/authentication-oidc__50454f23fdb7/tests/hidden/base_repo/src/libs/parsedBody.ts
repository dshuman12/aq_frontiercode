import { z } from "zod";

/**
 * Combinator: accepts a JSON-encoded string, parses it, pipes the result
 * through `schema`.
 *
 * - `missingMessage` is raised when the input is `undefined` / non-string
 *   or an empty string (both represent "caller didn't supply a value").
 * - `invalidJsonMessage` is raised when the string isn't valid JSON.
 *
 * Override either to match the domain — e.g. HTTP handlers want
 * `"Invalid request body"`, env-var consumers want a hint at where to
 * set the value. Defaults stay generic so callers can adopt piecemeal.
 */
export const jsonString = <T extends z.ZodTypeAny>(
  schema: T,
  {
    invalidJsonMessage = "Invalid JSON",
    missingMessage,
  }: { invalidJsonMessage?: string; missingMessage?: string } = {},
) =>
  z
    .string({ message: missingMessage })
    .min(1, { message: missingMessage })
    .transform((s, ctx) => {
      try {
        return JSON.parse(s);
      } catch {
        ctx.addIssue({ code: "custom", message: invalidJsonMessage });
        return z.NEVER;
      }
    })
    .pipe(schema);

/** `jsonString` wrapper tagged for HTTP request bodies — callers unchanged. */
export const jsonBody = <T extends z.ZodTypeAny>(schema: T) =>
  jsonString(schema, { invalidJsonMessage: "Invalid request body" });
