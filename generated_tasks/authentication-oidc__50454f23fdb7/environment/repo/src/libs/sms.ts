import {
  PhoneNumberValidateCommand,
  PhoneNumberValidateCommandOutput,
  PinpointClient,
  SendMessagesCommand,
  UpdateEndpointCommand,
} from "@aws-sdk/client-pinpoint";
import {
  EventOTPPayload,
  NoticicationProviderOptions,
  NotificationProviderFactory,
} from "@onmoapp/notification-provider";
import { salesforceCrmAdapter } from "@onmoapp/onmo-adapters";
import { randomUUID } from "crypto";
import dayjs from "dayjs";
import { ENV, REGION, PINPOINT_PROJECT_ID } from "@libs/config";

const pinpoint = new PinpointClient({ region: REGION });

const testNumbers = [
  // for the new reskinned app with extra checks
  "+447777777790", // JW
  "+447777777791", // JB
  "+447777777792", // Someone
  "+447777777793", // Abijit
  "+447777777794", // APPLE TESTING  ********************
  "+447777777795", // GOOGLE TESTING ********************
  "+447777777796", // Gurjit
  "+447777777797", // MS
  "+447777777798", // Sophia
  "+447777777799", // Someone
  "+447777777700", // Adam Beaton
  "+447777777701", // Brendan Abolivier
  "+447777777702", // ONMO SPARE
  "+447777777703", // ONMO SPARE
  "+447777777704", // ONMO SPARE
  "+447777777705", // DS
  "+447777777706", // Dinesh
  "+447777777707", // Someone
  "+447777777708", // Karri
  "+447777777709", // Max
  "+447777777771", // Ramakanth
  "+447777777772", // Ramakanth
  "+447777777773", // Matt Lowcock
  "+447777777774", // Jamal Tarafdar
  "+447777777775", // Jay
  "+447777777776", // Sophia
  "+447777777777", // GENERIC TEST NUMBER
  "+447777777778", // GENERIC TEST NUMBER
  "+447777777779", // GENERIC TEST NUMBER
  "+447777777770", // GENERIC TEST NUMBER
];

export const checkIfTestNumber = (inputNumber: string) => {
  if (ENV === "prod") {
    return false;
  }

  const testNumberPattern = /^\+4477766\d{5}$/;
  if (testNumberPattern.test(inputNumber)) {
    return true;
  }

  for (const testNumber of testNumbers) {
    if (testNumber === inputNumber) {
      return true;
    }
  }
  return false;
};

export const generateVerifyCode = () => Math.floor(Math.random() * (9999 - 1000 + 1) + 1000);

type SendSMSInput = { phoneNumber: string; messageBody: string };

export const sendSMS = async ({ phoneNumber, messageBody }: SendSMSInput) => {
  // retrieve destination number
  let destinationNumber;
  if (phoneNumber.length === 10) {
    destinationNumber = `+44${phoneNumber}`;
  } else {
    destinationNumber = phoneNumber;
  }

  // validate phone number
  let validateResponse: PhoneNumberValidateCommandOutput;
  const validateNumberCommand = new PhoneNumberValidateCommand({
    NumberValidateRequest: { IsoCountryCode: "GB", PhoneNumber: destinationNumber },
  });
  try {
    validateResponse = await pinpoint.send(validateNumberCommand);
  } catch (error: any) {
    throw new Error(
      `ValidationError: Failed to validate number ${destinationNumber}: ${error?.message || error}`,
    );
  }

  // phone number is valid
  if ((validateResponse?.NumberValidateResponse?.PhoneTypeCode as any) === 0) {
    const { CleansedPhoneNumberE164, ZipCode, City, CountryCodeIso2, Timezone } =
      validateResponse.NumberValidateResponse as any;
    const EndpointId = (CleansedPhoneNumberE164 as string).substring(1);

    const updateEndpointCommand = new UpdateEndpointCommand({
      ApplicationId: PINPOINT_PROJECT_ID,
      EndpointId,
      EndpointRequest: {
        ChannelType: "SMS",
        Address: CleansedPhoneNumberE164,
        OptOut: "ALL",
        Location: { PostalCode: ZipCode, City, Country: CountryCodeIso2 },
        Demographic: { Timezone },
      },
    });

    // update endpoint
    try {
      await pinpoint.send(updateEndpointCommand);
    } catch (error: any) {
      throw new Error(`Failed to update endpoint: ${error?.message || error}`);
    }

    const sendMessagesCommand = new SendMessagesCommand({
      ApplicationId: PINPOINT_PROJECT_ID,
      MessageRequest: {
        Addresses: { [CleansedPhoneNumberE164 as string]: { ChannelType: "SMS" } },
        MessageConfiguration: {
          SMSMessage: { Body: messageBody, MessageType: "TRANSACTIONAL" },
        },
      },
    });

    // send message
    try {
      return await pinpoint.send(sendMessagesCommand);
    } catch (error: any) {
      throw new Error(`Failed to send SMS message to pinpoint: ${error?.message || error}`);
    }
  }
  // phone number not valid
  else {
    throw new Error(`ValidationError: Cannot send SMS to ${destinationNumber}`);
  }
};

export const generateOTPMessageBody = (verifyCode: number, env: string = "staging") =>
  [
    `Your Onmo verification code is ${verifyCode}. This code will expire after 5 minutes. Do not share this code with anyone. If you're not expecting this, please call us.`,
    `${env === "prod" ? "@onmo.app" : "@staging.onmo.app"}`,
  ].join("\n\n");

export type OTPInput = {
  onmouuid: string;
  phoneNumber: string;
  emailAddress?: string;
  verifyCode: string;
};

export const sendOTPNotification = async (input: OTPInput, sourceName: string) => {
  const options: NoticicationProviderOptions = {
    configKey: "NOTIFICATIONS",
    eventMap: {
      otp: "OTP",
    },
  };

  const crmAdapter = await salesforceCrmAdapter("SALESFORCE_CLIENT");
  const crmCustomerResponse = await crmAdapter?.getCrmCustomerDetailsByCustomerId(input.onmouuid);
  const contactId = crmCustomerResponse?.data?.contactId;
  const notificationProvider = await NotificationProviderFactory.build("sfmc", options);

  const timestamp = dayjs().toISOString();
  const payload: EventOTPPayload = {
    ContactKey: contactId,
    EventDefinitionKey: "otp",
    Data: {
      PersonContactID: contactId,
      UniqueID: randomUUID(),
      Code: input.verifyCode,
      Source: "auth-" + sourceName,
      OnmoUUID: input.onmouuid,
      Timestamp: timestamp,
      Phone: input.phoneNumber.replace(/^\+/, ""),
      Locale: "GB",
    },
  };

  const notificationResponse = await notificationProvider.sendOTPNotification(payload);

  if (!notificationResponse.ok) {
    const err = notificationResponse.error;
    throw new Error(
      `Notification provider failed to send OTP: ${err?.name ?? "UnknownError"}: ${err?.message ?? "No message"}: ${err?.stack ?? "No stack"}`,
    );
  }
};
