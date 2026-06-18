import type { GatewayKey, RouteEntry } from "../types";

/**
 * Stamps a single `gateway` onto a list of route entries. Each per-service
 * file owns one gateway, so lifting the field out of every entry keeps the
 * data narrow and removes the mistake-class of "wrong gateway in this file".
 */
export type RouteWithoutGateway = Omit<RouteEntry, "gateway">;

export const withGateway = (gateway: GatewayKey, entries: RouteWithoutGateway[]): RouteEntry[] =>
  entries.map((entry) => ({ gateway, ...entry }));
