import { POSTHOG_NOTIFICATION_FLAG_KEY, POSTHOG_SECRET_NAME } from "@libs/config";
import { logger } from "@onmoapp/logger";
import { getSecret } from "@onmoapp/onmo-secrets-manager";
import { PostHog } from "posthog-node";
import { generateOTPMessageBody, sendOTPNotification, sendSMS } from "./sms";

export type CustomerIdentity = { onmouuid: string };

export type NotificationHandler = () => Promise<void>;

export type NotificationProvider = "sfmc" | "pinpoint";

export async function getNotificationProviderFlag(
  id: CustomerIdentity,
): Promise<NotificationProvider> {
  if (!POSTHOG_NOTIFICATION_FLAG_KEY)
    throw new Error("Missing POSTHOG_NOTIFICATION_FLAG_KEY env value");

  const client = await getFeatureFlagClient();

  const flagValue = await client.getFeatureFlag(POSTHOG_NOTIFICATION_FLAG_KEY, id.onmouuid, {
    personProperties: id,
  });

  return flagValue ? "sfmc" : "pinpoint";
}

async function getFeatureFlagClient(): Promise<PostHog> {
  if (!POSTHOG_SECRET_NAME) throw new Error("Missing POSTHOG_SECRET_NAME env value");

  const secretString = await getSecret(POSTHOG_SECRET_NAME);
  const { apiKey, host } = JSON.parse(secretString.SecretString!);

  return new PostHog(apiKey, { host });
}

export async function notificationProviderHandler(
  flag: NotificationProvider,
  handlers: { sfmc: NotificationHandler; pinpoint: NotificationHandler },
): Promise<void> {
  await handlers[flag]();
}

export async function runNotificationProvider(
  onmouuid: string,
  verifyCode: number,
  phoneNumber: string,
  source: string,
  env: string,
): Promise<void> {
  const flag = await getNotificationProviderFlag({ onmouuid });
  logger.addContext("notification_provider", flag);

  await notificationProviderHandler(flag, {
    sfmc: async () =>
      await sendOTPNotification(
        {
          onmouuid,
          phoneNumber,
          verifyCode: verifyCode.toString(),
        },
        source,
      ),
    pinpoint: async () => {
      await sendSMS({ phoneNumber, messageBody: generateOTPMessageBody(verifyCode, env) });
    },
  });
}
