import { Logger } from "@onmoapp/onmo-logger";
import { getSecret } from "@onmoapp/onmo-secrets-manager";
import { PostHog } from "posthog-node";
import { generateOTPMessageBody, sendOTPNotification, sendSMS } from "./sms";

export type CustomerIdentity = { onmouuid: string };

export type NotificationHandler = () => Promise<void>;

export type NotificationProvider = "sfmc" | "pinpoint";

export async function getNotificationProviderFlag(
  id: CustomerIdentity,
): Promise<NotificationProvider> {
  const flagKey = process.env.POSTHOG_NOTIFICATION_FLAG_KEY;
  if (!flagKey) throw new Error("Missing POSTHOG_NOTIFICATION_FLAG_KEY env value");

  const client = await getFeatureFlagClient();

  const flagValue = await client.getFeatureFlag(flagKey!, id.onmouuid, {
    personProperties: id,
  });

  return flagValue ? "sfmc" : "pinpoint";
}

async function getFeatureFlagClient(): Promise<PostHog> {
  const secretName = process.env.POSTHOG_SECRET_NAME;
  if (!secretName) throw new Error("Missing POSTHOG_SECRET_NAME env value");

  const secretString = await getSecret(secretName);
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
  logger: Logger,
): Promise<void> {
  const flag = await getNotificationProviderFlag({ onmouuid });
  logger.addContext({ notification_provider: flag });

  await notificationProviderHandler(flag, {
    sfmc: async () =>
      await sendOTPNotification(
        {
          onmouuid,
          phoneNumber,
          verifyCode: verifyCode.toString(),
        },
        source,
        logger,
      ),
    pinpoint: async () => {
      await sendSMS({ phoneNumber, messageBody: generateOTPMessageBody(verifyCode, env) });
    },
  });
}
