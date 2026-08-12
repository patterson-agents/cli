/**
 * Barrel for the check registry (T016).
 */
export { SEVERITIES, SEVERITY_RANK } from "./types.ts";
export type { CheckCtx, CheckDef, Finding, Severity } from "./types.ts";

export { CheckRegistry, compareFindings } from "./registry.ts";
export type { CheckReport, CheckRunRecord } from "./registry.ts";

export {
  MARKETPLACE_MANIFEST_PATHS,
  marketplaceChecks,
  marketplaceManifestsDivergedCheck,
} from "./marketplace.ts";
