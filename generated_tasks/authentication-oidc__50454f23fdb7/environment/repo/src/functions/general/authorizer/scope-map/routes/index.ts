import type { RouteEntry } from "../types";
import { routes as accountService } from "./account-service";
import { routes as alertService } from "./alert-service";
import { routes as apiBroker } from "./api-broker";
import { routes as apr } from "./apr";
import { routes as authentication } from "./authentication";
import { routes as biometricsService } from "./biometrics-service";
import { routes as cardService } from "./card-service";
import { routes as customerCare } from "./customer-care";
import { routes as customerService } from "./customer-service";
import { routes as deviceChannel } from "./device-channel";
import { routes as repaymentService } from "./repayment-service";
import { routes as transactionService } from "./transaction-service";
import { withGateway } from "./with-gateway";

/**
 * All authorizer-gated routes, gateway-stamped. Order is cosmetic
 * (regex-matched at lookup); authentication first keeps shadow-divergence
 * logs grouped by service.
 */
export const routes: RouteEntry[] = [
  ...withGateway("authentication", authentication),
  ...withGateway("api_broker", apiBroker),
  ...withGateway("apr", apr),
  ...withGateway("customer_care", customerCare),
  ...withGateway("customer_service_oidc", customerService),
  ...withGateway("account_service_oidc", accountService),
  ...withGateway("card_service_oidc", cardService),
  ...withGateway("alert_service_oidc", alertService),
  ...withGateway("transaction_service_oidc", transactionService),
  ...withGateway("device_channel", deviceChannel),
  ...withGateway("repayment_service", repaymentService),
  ...withGateway("biometrics_service", biometricsService),
];
