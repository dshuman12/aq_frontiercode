import { LogLevel } from "@onmoapp/onmo-logger";
import { Logger } from "@onmoapp/onmo-logger";
import { TEST_EMAIL } from "./testConstants";
import sgMail from "@sendgrid/mail";

const env = process.env.ENVIRONMENT as string;
const api_version = process.env.API_VERSION as string;

export const checkIfTestEmail = (email: string) => email === TEST_EMAIL;

export const titleCase = (name: string) => {
  return typeof name === "string"
    ? name
        .toLowerCase()
        .split(" ")
        .map((namePart) => `${namePart.charAt(0).toUpperCase()}${namePart.slice(1)}`)
        .join(" ")
    : "";
};

enum TemplateType {
  EMAIL_CHANGE = "email_change",
  PHONE_CHANGE = "phone_change",
  PASSWORD_CHANGE = "password_change",
}

const getTemplateType = (templateId: string): TemplateType => {
  const TEMPLATE_TYPE_MAP: Record<string, TemplateType> = {
    "d-79ff22b5eeff4653959840e5b7006b9a": TemplateType.PHONE_CHANGE,
    "d-c827c1b391024ebc89450079a523e644": TemplateType.EMAIL_CHANGE,
    "d-d7105ae9737347a78784abb2720eba96": TemplateType.PASSWORD_CHANGE,
  };

  return TEMPLATE_TYPE_MAP[templateId];
};

type SendEmailInput = {
  api_key: string;
  template_id: string;
  email_address: string;
  first_name: string;
  transaction_id: string;
  verify_code: number;
};

export const sendEmail = async ({
  api_key,
  template_id,
  email_address,
  first_name,
  transaction_id,
  verify_code,
}: SendEmailInput) => {
  const logger = new Logger({ env }, (process.env.LOGGING_LEVEL as LogLevel) || "INFO");

  sgMail.setApiKey(api_key);

  const hostname = env === "prod" ? `https://auth.onmo.app` : `https://auth.staging.onmo.app`;

  const templateType = getTemplateType(template_id);

  const TEMPLATE_REDIRECT_PATHS: Record<TemplateType, string> = {
    [TemplateType.EMAIL_CHANGE]: `${transaction_id}/email-change/redirect`,
    [TemplateType.PHONE_CHANGE]: `${transaction_id}/phone-change/email/redirect`,
    [TemplateType.PASSWORD_CHANGE]: `${transaction_id}/forgotten-passcode/email/redirect`,
  };

  const redirectPath = TEMPLATE_REDIRECT_PATHS[templateType];

  const redirectURL = `${hostname}/oidc/${api_version || "v5"}/${redirectPath}?verify_code=${verify_code}`;

  logger.info(`Redirect URL: ${redirectURL}`);

  const TEMPLATE_SUBJECTS: Record<TemplateType, string> = {
    [TemplateType.EMAIL_CHANGE]: "Email Change Request",
    [TemplateType.PHONE_CHANGE]: "Phone Number Change Request",
    [TemplateType.PASSWORD_CHANGE]: "Password Change Request",
  };

  const sendgridMessage = {
    from: { email: "help@onmo.app" },
    personalizations: [
      {
        to: [{ email: email_address }],
        dynamic_template_data: {
          firstName: titleCase(first_name),
          redirectURL,
          subject: TEMPLATE_SUBJECTS[templateType],
          currentYear: new Date().getFullYear().toString(),
        },
      },
    ],
    template_id,
  };

  // @ts-ignore
  await sgMail.send(sendgridMessage);
};
