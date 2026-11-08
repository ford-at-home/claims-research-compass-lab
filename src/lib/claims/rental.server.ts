import { runRentalBaseline, type SupplierAdapter } from "./rental";

// No endpoint or interface contract has been supplied. Do not invent one or read fixture fields.
export const supplierAdapter: SupplierAdapter = {
  getPricing: () => ({ status: "unconfigured", error: "No real supplier interface contract or connection is configured in this project. Pricing capability is confirmed by the user; other capabilities remain unverified." }),
};

export function runRentalLive(input: unknown, hash: string, now: string) {
  return runRentalBaseline(input, hash, "live", supplierAdapter, now);
}