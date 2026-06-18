type FormatJSONResponseInput = {
  statusCode: number;
  body?: Record<string, unknown>;
  headers?: Record<string, string> & { Location?: string };
};

const baseJSONHeaders = {
  "Content-Type": "application/json",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
};

export const formatJSONResponse = ({
  statusCode,
  body = {},
  headers = {},
}: FormatJSONResponseInput) => {
  return { statusCode, body, headers: { ...baseJSONHeaders, ...headers } };
};

export const formatHTMLResponse = ({ statusCode, body }: { statusCode: number; body: string }) => ({
  statusCode,
  body,
  headers: { "Content-Type": "text/html" },
});
