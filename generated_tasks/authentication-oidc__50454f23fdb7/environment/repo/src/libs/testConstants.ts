export type AuthorizeSuccessRespBody = {
  transaction_id: string;
  next_endpoint: string;
  login_scenario?: string;
};
export type AuthorizeErrorRespBody = { message: string };

export const TEST_CODE_CHALLENGE = "Qq1fGD0HhxwbmeMrqaebgn1qhvKeguQPXqLdpmixaM4";
export const TEST_CODE_VERIFIER = "test_code_verifier";
export const TEST_NUMBER = "+447776661234";
export const TEST_EMAIL = "test@test.com";
export const TEST_PASSCODE = "123456";
export const TEST_AUTH_CODE = "test_auth_code";
export const TEST_RUN_ID = "test";
export const TEST_LOAN_ACCOUNT_ID = "test_loan_account_id";
export const CREDIT_ACCOUNT_PRODUCT_KEY = "8a195c577be36893017be4085f860a03";
export const TECHNICAL_ACCOUNT_PRODUCT_KEY = "8a19518a784041660178408b2afd2100";

// existing test accounts
export const TEST_ACTIVE_CREDIT_CUSTOMER = {
  coreBankingCreditAccountId: "LHQD560",
  customerId: "AUTH_API_TEST_ACTIVE_ACCOUNT",
  coreBankingCustomerId: "846862306",
  mobileNumber: "+447776669091",
  deviceId: "test-1719577501523",
  cardId: "425027956",
};
export const TEST_ACTIVE_IN_ARREARS_CREDIT_CUSTOMER = {
  coreBankingCreditAccountId: "CVSR440",
  customerId: "AUTH_API_TEST_ACTIVE_IN_ARREARS_ACCOUNT",
  coreBankingCustomerId: "052660930",
  mobileNumber: "+447776669092",
  deviceId: "test-1719577501524",
};

// FOR APP TESTER
export const APP_TESTER_NUMBER = "+447000000000";
export const APP_TESTER_ONMOUUID = "fb5faaec-49e5-454e-9bb8-8e8099833b69";
export type AppTesterLoginConfig = { enabled: boolean; sms_otp: number; passcode: string };
