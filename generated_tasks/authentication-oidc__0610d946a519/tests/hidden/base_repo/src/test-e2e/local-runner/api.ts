import { Hono } from "hono";
import { handler as sendOtp } from "@functions/otp/sendOTP/sendOTP";
import { handler as verifyOtp } from "@functions/otp/verifyOTP/verifyOTP";
import { handler as authOtp } from "@functions/otp/authorize/authorize";
import { handler as userInfo } from "@functions/other/userInfo/userInfo";
import { handler as passcodeVerifyOtp } from "@functions/otp-passcode/otp-passcode-verifyOTP/otp-passcode-verifyOTP";
import { handler as passcodeSendOtp } from "@functions/otp-passcode/otp-passcode-sendOTP/otp-passcode-sendOTP";
import { handler as resendOtp } from "@functions/otp-passcode/otp-passcode-resendOTP/otp-passcode-resendOTP";
import { handler as authOtpPasscode } from "@functions/otp-passcode/otp-passcode-authorize/otp-passcode-authorize";
import { handler as verifyPasscode } from "@functions/otp-passcode/otp-passcode-verifyPasscode/otp-passcode-verifyPasscode";
import { handler as logout } from "@functions/general/logout/logout";
import { handler as emailChangeInit } from "@functions/email-change/email-change-initiate/email-change-initiate";
import { handler as emailChangeValidate } from "@functions/email-change/email-change-validate/email-change-validate";
import { handler as forgotPassAuthIn } from "@functions/forgotten-passcode/forgot-pass-authorize-in/forgot-pass-authorize-in";
import { handler as forgotPassSendOtp } from "@functions/forgotten-passcode/forgot-pass-sendOTP/forgot-pass-sendOTP";
import { handler as forgotPassVerifyOtp } from "@functions/forgotten-passcode/forgot-pass-verifyOTP/forgot-pass-verifyOTP";
import { handler as forgotPassResendOtp } from "@functions/forgotten-passcode/forgot-pass-resendOTP/forgot-pass-resendOTP";
import { handler as token } from "@functions/general/token/token";
import { handler as eligibility } from "@functions/general/eligibility/eligibility";
import { handler as phoneChangeValidate } from "@functions/phone-change/phone-change-validate-otp/phone-change-validate-otp";
import { handler as phoneChangeInit } from "@functions/phone-change/phone-change-initiate/phone-change-initiate";
import { handler as phoneChangeEmailRedirect } from "@functions/phone-change/phone-change-email-redirect/phone-change-email-redirect";
import { handler as phoneChangeEmailSend } from "@functions/phone-change/phone-change-email-send/phone-change-email-send";
import { handler as phoneChangeEmailVerify } from "@functions/phone-change/phone-change-email-verify/phone-change-email-verify";

import { handler as extraScopeAuth } from "@functions/extra-scope/extra-scope-authorize/extra-scope-authorize";
import { handler as extraScopeSendOtp } from "@functions/extra-scope/extra-scope-sendOTP/extra-scope-sendOTP";
import { handler as extraScopeResendOtp } from "@functions/extra-scope/extra-scope-resendOTP/extra-scope-resendOTP";
import { handler as extraScopeVerifyOtp } from "@functions/extra-scope/extra-scope-verifyOTP/extra-scope-verifyOTP";
import { handler as extraScopeVerifyPasscode } from "@functions/extra-scope/extra-scope-verifyPasscode/extra-scope-verifyPasscode";
import { handler as extraScopeVerifyBio } from "@functions/extra-scope/extra-scope-verifyBiometrics/extra-scope-verifyBiometrics";

import { handler as bioRegInit } from "@functions/biometrics/biometrics-reg-initiate/biometrics-reg-initiate";
import { handler as bioRegComplete } from "@functions/biometrics/biometrics-reg-complete/biometrics-reg-complete";
import { handler as bioAuth } from "@functions/biometrics/biometrics-authorize/biometrics-authorize";

import { useGatewayHandler } from "./utils";

export const app = new Hono();

app.post("/oidc/next/:transaction_id/otp/send", useGatewayHandler(sendOtp));
app.post("/oidc/next/:transaction_id/otp/verify", useGatewayHandler(verifyOtp));

app.get("/oidc/next/user-info", useGatewayHandler(userInfo));

app.post(
  "/oidc/next/:transaction_id/otp-passcode/otp/verify",
  useGatewayHandler(passcodeVerifyOtp),
);

app.post("/oidc/next/:transaction_id/otp-passcode/otp/send", useGatewayHandler(passcodeSendOtp));

app.post("/oidc/next/:transaction_id/otp-passcode/otp/resend", useGatewayHandler(resendOtp));

app.post("/oidc/next/authorize/otp-passcode", useGatewayHandler(authOtpPasscode));
app.post("/oidc/next/authorize/otp", useGatewayHandler(authOtp));

app.post(
  "/oidc/next/:transaction_id/otp-passcode/passcode/verify",
  useGatewayHandler(verifyPasscode),
);

app.post("/oidc/next/eligibility", useGatewayHandler(eligibility));

app.post("/oidc/next/token", useGatewayHandler(token));

app.post("/oidc/next/logout", useGatewayHandler(logout));

app.post("/oidc/next/:transaction_id/email-change/initiate", useGatewayHandler(emailChangeInit));
app.post(
  "/oidc/next/:transaction_id/email-change/validate",
  useGatewayHandler(emailChangeValidate),
);

app.post("/oidc/next/authorize/forgotten-passcode/logged-in", useGatewayHandler(forgotPassAuthIn));
app.post(
  "/oidc/next/:transaction_id/forgotten-passcode/otp/send",
  useGatewayHandler(forgotPassSendOtp),
);
app.post(
  "/oidc/next/:transaction_id/forgotten-passcode/otp/verify",
  useGatewayHandler(forgotPassVerifyOtp),
);
app.post(
  "/oidc/next/:transaction_id/forgotten-passcode/otp/resend",
  useGatewayHandler(forgotPassResendOtp),
);

app.post("/oidc/next/:transaction_id/phone-change/initiate", useGatewayHandler(phoneChangeInit));
app.get(
  "/oidc/next/:transaction_id/phone-change/email/redirect",
  useGatewayHandler(phoneChangeEmailRedirect),
);
app.post(
  "/oidc/next/:transaction_id/phone-change/otp/verify",
  useGatewayHandler(phoneChangeValidate),
);

app.post(
  "/oidc/next/:transaction_id/phone-change/email/send",
  useGatewayHandler(phoneChangeEmailSend),
);

app.post(
  "/oidc/next/:transaction_id/phone-change/email/verify",
  useGatewayHandler(phoneChangeEmailVerify),
);

app.post("/oidc/next/authorize/extra-scope", useGatewayHandler(extraScopeAuth));
app.post("/oidc/next/:transaction_id/extra-scope/otp/send", useGatewayHandler(extraScopeSendOtp));

app.post(
  "/oidc/next/:transaction_id/extra-scope/otp/verify",
  useGatewayHandler(extraScopeVerifyOtp),
);

app.post(
  "/oidc/next/:transaction_id/extra-scope/passcode/verify",
  useGatewayHandler(extraScopeVerifyPasscode),
);

app.post("/oidc/next/authorize/biometrics/register", useGatewayHandler(bioRegInit));

app.post("/oidc/next/:transaction_id/biometrics/register", useGatewayHandler(bioRegComplete));

app.post("/oidc/next/authorize/biometrics", useGatewayHandler(bioAuth));

app.post(
  "/oidc/next/:transaction_id/extra-scope/biometrics/verify",
  useGatewayHandler(extraScopeVerifyBio),
);

app.post(
  "/oidc/next/:transaction_id/extra-scope/otp/resend",
  useGatewayHandler(extraScopeResendOtp),
);

app.use("/*", async (ctx, next) => {
  await next();
  console.warn("unknown path", ctx.req.path, ctx.req.method);
  ctx.status(404);
  return ctx.json({
    error: "unknown path",
    method: ctx.req.method,
    path: ctx.req.path,
  });
});

/*
/oidc/next/authorize/forgotten-passcode/logged-out POST
/oidc/next/token POST
/oidc/next/eligibility
/oidc/next/authorize/forgotten-passcode/logged-in
/oidc/next/authorize/forgotten-passcode/logged-out
 */
