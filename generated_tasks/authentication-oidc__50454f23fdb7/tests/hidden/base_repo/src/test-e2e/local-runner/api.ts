import { Hono } from "hono";

// -- biometrics
import { handler as bioAuth } from "@functions/biometrics/biometrics-authorize/biometrics-authorize";
import { handler as bioRegComplete } from "@functions/biometrics/biometrics-reg-complete/biometrics-reg-complete";
import { handler as bioRegInit } from "@functions/biometrics/biometrics-reg-initiate/biometrics-reg-initiate";
import { handler as bioVerify } from "@functions/biometrics/biometrics-verify/biometrics-verify";

// -- email-change
import { handler as emailChangeEmailResend } from "@functions/email-change/email-change-email-resend/email-change-email-resend";
import { handler as emailChangeInit } from "@functions/email-change/email-change-initiate/email-change-initiate";
import { handler as emailChangeOtpResend } from "@functions/email-change/email-change-otp-resend/email-change-otp-resend";
import { handler as emailChangeRedirect } from "@functions/email-change/email-change-redirect/email-change-redirect";
import { handler as emailChangeValidate } from "@functions/email-change/email-change-validate/email-change-validate";

// -- extra-scope
import { handler as extraScopeAuth } from "@functions/extra-scope/extra-scope-authorize/extra-scope-authorize";
import { handler as extraScopeResendOtp } from "@functions/extra-scope/extra-scope-resendOTP/extra-scope-resendOTP";
import { handler as extraScopeSendOtp } from "@functions/extra-scope/extra-scope-sendOTP/extra-scope-sendOTP";
import { handler as extraScopeVerifyBio } from "@functions/extra-scope/extra-scope-verifyBiometrics/extra-scope-verifyBiometrics";
import { handler as extraScopeVerifyOtp } from "@functions/extra-scope/extra-scope-verifyOTP/extra-scope-verifyOTP";
import { handler as extraScopeVerifyPasscode } from "@functions/extra-scope/extra-scope-verifyPasscode/extra-scope-verifyPasscode";

// -- forgotten-passcode
import { handler as forgotPassAuthIn } from "@functions/forgotten-passcode/forgot-pass-authorize-in/forgot-pass-authorize-in";
import { handler as forgotPassAuthOut } from "@functions/forgotten-passcode/forgot-pass-authorize-out/forgot-pass-authorize-out";
import { handler as forgotPassRedirect } from "@functions/forgotten-passcode/forgot-pass-redirect/forgot-pass-redirect";
import { handler as forgotPassResendEmail } from "@functions/forgotten-passcode/forgot-pass-resendEmail/forgot-pass-resendEmail";
import { handler as forgotPassResendOtp } from "@functions/forgotten-passcode/forgot-pass-resendOTP/forgot-pass-resendOTP";
import { handler as forgotPassSendEmail } from "@functions/forgotten-passcode/forgot-pass-sendEmail/forgot-pass-sendEmail";
import { handler as forgotPassSendOtp } from "@functions/forgotten-passcode/forgot-pass-sendOTP/forgot-pass-sendOTP";
import { handler as forgotPassVerifyEmail } from "@functions/forgotten-passcode/forgot-pass-verifyEmail/forgot-pass-verifyEmail";
import { handler as forgotPassVerifyOtp } from "@functions/forgotten-passcode/forgot-pass-verifyOTP/forgot-pass-verifyOTP";

// -- general
import { handler as eligibility } from "@functions/general/eligibility/eligibility";
import { handler as logout } from "@functions/general/logout/logout";
import { handler as token } from "@functions/general/token/token";

// -- other
import { handler as appDownloadRedirect } from "@functions/other/appDownloadRedirect/appDownloadRedirect";
import { handler as changePasscode } from "@functions/other/changePasscode/changePasscode";
import { handler as stats } from "@functions/other/stats/stats";
import { handler as statsHistory } from "@functions/other/statsHistory/statsHistory";
import { handler as userInfo } from "@functions/other/userInfo/userInfo";

// -- otp
import { handler as authOtp } from "@functions/otp/authorize/authorize";
import { handler as sendOtp } from "@functions/otp/sendOTP/sendOTP";
import { handler as verifyOtp } from "@functions/otp/verifyOTP/verifyOTP";

// -- otp-passcode
import { handler as authOtpPasscode } from "@functions/otp-passcode/otp-passcode-authorize/otp-passcode-authorize";
import { handler as resendOtp } from "@functions/otp-passcode/otp-passcode-resendOTP/otp-passcode-resendOTP";
import { handler as passcodeSendOtp } from "@functions/otp-passcode/otp-passcode-sendOTP/otp-passcode-sendOTP";
import { handler as passcodeVerifyOtp } from "@functions/otp-passcode/otp-passcode-verifyOTP/otp-passcode-verifyOTP";
import { handler as verifyPasscode } from "@functions/otp-passcode/otp-passcode-verifyPasscode/otp-passcode-verifyPasscode";

// -- phone-change
import { handler as phoneChangeEmailRedirect } from "@functions/phone-change/phone-change-email-redirect/phone-change-email-redirect";
import { handler as phoneChangeEmailResend } from "@functions/phone-change/phone-change-email-resend/phone-change-email-resend";
import { handler as phoneChangeEmailSend } from "@functions/phone-change/phone-change-email-send/phone-change-email-send";
import { handler as phoneChangeEmailVerify } from "@functions/phone-change/phone-change-email-verify/phone-change-email-verify";
import { handler as phoneChangeInit } from "@functions/phone-change/phone-change-initiate/phone-change-initiate";
import { handler as phoneChangeOtpResend } from "@functions/phone-change/phone-change-otp-resend/phone-change-otp-resend";
import { handler as phoneChangeValidate } from "@functions/phone-change/phone-change-validate-otp/phone-change-validate-otp";

import { useGatewayHandler } from "./utils";

export const app = new Hono();

// -- biometrics
app.post("/oidc/next/authorize/biometrics", useGatewayHandler(bioAuth, { requiresAuth: false }));
app.post("/oidc/next/authorize/biometrics/register", useGatewayHandler(bioRegInit));
app.post("/oidc/next/:transaction_id/biometrics/register", useGatewayHandler(bioRegComplete));
app.post(
  "/oidc/next/:transaction_id/biometrics/verify",
  useGatewayHandler(bioVerify, { requiresAuth: false }),
);

// -- email-change
app.post("/oidc/next/:transaction_id/email-change/initiate", useGatewayHandler(emailChangeInit));
app.get(
  "/oidc/next/:transaction_id/email-change/redirect",
  useGatewayHandler(emailChangeRedirect, { requiresAuth: false }),
);
app.post(
  "/oidc/next/:transaction_id/email-change/validate",
  useGatewayHandler(emailChangeValidate),
);
app.post(
  "/oidc/next/:transaction_id/email-change/email/resend",
  useGatewayHandler(emailChangeEmailResend),
);
app.post(
  "/oidc/next/:transaction_id/email-change/otp/resend",
  useGatewayHandler(emailChangeOtpResend),
);

// -- extra-scope
app.post("/oidc/next/authorize/extra-scope", useGatewayHandler(extraScopeAuth));
app.post("/oidc/next/:transaction_id/extra-scope/otp/send", useGatewayHandler(extraScopeSendOtp));
app.post(
  "/oidc/next/:transaction_id/extra-scope/otp/resend",
  useGatewayHandler(extraScopeResendOtp),
);
app.post(
  "/oidc/next/:transaction_id/extra-scope/otp/verify",
  useGatewayHandler(extraScopeVerifyOtp),
);
app.post(
  "/oidc/next/:transaction_id/extra-scope/passcode/verify",
  useGatewayHandler(extraScopeVerifyPasscode),
);
app.post(
  "/oidc/next/:transaction_id/extra-scope/biometrics/verify",
  useGatewayHandler(extraScopeVerifyBio),
);

// -- forgotten-passcode
app.post("/oidc/next/authorize/forgotten-passcode/logged-in", useGatewayHandler(forgotPassAuthIn));
app.post(
  "/oidc/next/authorize/forgotten-passcode/logged-out",
  useGatewayHandler(forgotPassAuthOut, { requiresAuth: false }),
);
app.post(
  "/oidc/next/:transaction_id/forgotten-passcode/otp/send",
  useGatewayHandler(forgotPassSendOtp, { requiresAuth: false }),
);
app.post(
  "/oidc/next/:transaction_id/forgotten-passcode/otp/resend",
  useGatewayHandler(forgotPassResendOtp, { requiresAuth: false }),
);
app.post(
  "/oidc/next/:transaction_id/forgotten-passcode/otp/verify",
  useGatewayHandler(forgotPassVerifyOtp, { requiresAuth: false }),
);
app.post(
  "/oidc/next/:transaction_id/forgotten-passcode/email/send",
  useGatewayHandler(forgotPassSendEmail, { requiresAuth: false }),
);
app.post(
  "/oidc/next/:transaction_id/forgotten-passcode/email/resend",
  useGatewayHandler(forgotPassResendEmail, { requiresAuth: false }),
);
app.post(
  "/oidc/next/:transaction_id/forgotten-passcode/email/verify",
  useGatewayHandler(forgotPassVerifyEmail, { requiresAuth: false }),
);
app.get(
  "/oidc/next/:transaction_id/forgotten-passcode/email/redirect",
  useGatewayHandler(forgotPassRedirect, { requiresAuth: false }),
);

// -- general
app.post("/oidc/next/eligibility", useGatewayHandler(eligibility));
app.post("/oidc/next/logout", useGatewayHandler(logout));
app.post("/oidc/next/token", useGatewayHandler(token, { requiresAuth: false }));

// -- other
app.get(
  "/oidc/next/app-download-redirect",
  useGatewayHandler(appDownloadRedirect, { requiresAuth: false }),
);
app.post("/oidc/next/change-passcode", useGatewayHandler(changePasscode));
app.get("/oidc/next/stats", async (ctx) => {
  const result = await stats({});
  ctx.status(result.statusCode as any);
  return ctx.html(result.body);
});
app.get("/oidc/next/stats/history", async (ctx) => {
  const result = await statsHistory({});
  ctx.status(result.statusCode as any);
  return ctx.html(result.body);
});
app.get("/oidc/next/user-info", useGatewayHandler(userInfo));

// -- otp
app.post("/oidc/next/authorize/otp", useGatewayHandler(authOtp, { requiresAuth: false }));
app.post(
  "/oidc/next/:transaction_id/otp/send",
  useGatewayHandler(sendOtp, { requiresAuth: false }),
);
app.post(
  "/oidc/next/:transaction_id/otp/verify",
  useGatewayHandler(verifyOtp, { requiresAuth: false }),
);

// -- otp-passcode
app.post(
  "/oidc/next/authorize/otp-passcode",
  useGatewayHandler(authOtpPasscode, { requiresAuth: false }),
);
app.post(
  "/oidc/next/:transaction_id/otp-passcode/otp/send",
  useGatewayHandler(passcodeSendOtp, { requiresAuth: false }),
);
app.post(
  "/oidc/next/:transaction_id/otp-passcode/otp/resend",
  useGatewayHandler(resendOtp, { requiresAuth: false }),
);
app.post(
  "/oidc/next/:transaction_id/otp-passcode/otp/verify",
  useGatewayHandler(passcodeVerifyOtp, { requiresAuth: false }),
);
app.post(
  "/oidc/next/:transaction_id/otp-passcode/passcode/verify",
  useGatewayHandler(verifyPasscode, { requiresAuth: false }),
);

// -- phone-change
app.post("/oidc/next/:transaction_id/phone-change/initiate", useGatewayHandler(phoneChangeInit));
app.get(
  "/oidc/next/:transaction_id/phone-change/email/redirect",
  useGatewayHandler(phoneChangeEmailRedirect, { requiresAuth: false }),
);
app.post(
  "/oidc/next/:transaction_id/phone-change/email/resend",
  useGatewayHandler(phoneChangeEmailResend),
);
app.post(
  "/oidc/next/:transaction_id/phone-change/email/send",
  useGatewayHandler(phoneChangeEmailSend),
);
app.post(
  "/oidc/next/:transaction_id/phone-change/email/verify",
  useGatewayHandler(phoneChangeEmailVerify),
);
app.post(
  "/oidc/next/:transaction_id/phone-change/otp/resend",
  useGatewayHandler(phoneChangeOtpResend),
);
app.post(
  "/oidc/next/:transaction_id/phone-change/otp/verify",
  useGatewayHandler(phoneChangeValidate),
);

// -- catch-all for unknown routes
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
