/**
 * Check registry: register / run-all / run-subset, with aggregation into a
 * report object whose JSON projection is stable (fixed key order, deterministic
 * finding ordering) — the shape behind `doctor --json` / `check --json` (T016).
 */
import {
  SEVERITIES,
  SEVERITY_RANK,
  type CheckCtx,
  type CheckDef,
  type Finding,
  type Severity,
} from "./types.ts";

/**
 * Locale-independent codepoint comparison. All ordering that feeds the stable
 * `--json` contract uses this instead of `localeCompare`, whose result depends
 * on the runtime's resolved ICU locale (non-ASCII ids/messages/paths would
 * order differently across machines and break golden fixtures).
 */
function compareStrings(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

// ---------------------------------------------------------------------------
// Report shape (stable --json contract)
// ---------------------------------------------------------------------------

export interface CheckRunRecord {
  id: string;
  description: string;
  /** Findings of this check, sorted by severity then message/path. */
  findings: Finding[];
}

export interface CheckReport {
  /** True iff no finding reached "error" severity. */
  ok: boolean;
  summary: {
    total: number;
    error: number;
    warn: number;
    info: number;
  };
  /** One record per executed check, sorted by check id. */
  checks: CheckRunRecord[];
  /** All findings flattened, sorted most-severe-first (then checkId). */
  findings: Finding[];
}

/**
 * Deterministic finding order: severity rank (error < warn < info), then
 * checkId, then message, then path.
 */
export function compareFindings(a: Finding, b: Finding): number {
  const bySeverity = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
  if (bySeverity !== 0) return bySeverity;
  const byCheck = compareStrings(a.checkId, b.checkId);
  if (byCheck !== 0) return byCheck;
  const byMessage = compareStrings(a.message, b.message);
  if (byMessage !== 0) return byMessage;
  return compareStrings(a.path ?? "", b.path ?? "");
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export class CheckRegistry {
  readonly #checks = new Map<string, CheckDef>();

  /** Register a check. Duplicate or empty ids are hard errors. */
  register(check: CheckDef): void {
    if (!check.id) {
      throw new Error("Check id must be a non-empty string.");
    }
    if (this.#checks.has(check.id)) {
      throw new Error(`Check id "${check.id}" is already registered.`);
    }
    this.#checks.set(check.id, check);
  }

  has(id: string): boolean {
    return this.#checks.has(id);
  }

  get(id: string): CheckDef | undefined {
    return this.#checks.get(id);
  }

  /** All registered ids, sorted (deterministic). */
  ids(): string[] {
    return [...this.#checks.keys()].toSorted(compareStrings);
  }

  /** All registered checks, sorted by id (deterministic). */
  list(): CheckDef[] {
    return this.ids().map((id) => {
      const check = this.#checks.get(id);
      // ids() only yields registered keys.
      if (!check) throw new Error(`Check "${id}" disappeared from the registry.`);
      return check;
    });
  }

  /** Run every registered check. */
  async runAll(ctx: CheckCtx): Promise<CheckReport> {
    return this.run(this.ids(), ctx);
  }

  /**
   * Run a subset by id. Unknown ids throw (listing the known ids); duplicate
   * requested ids run once. Execution and report order is sorted by id.
   */
  async run(ids: readonly string[], ctx: CheckCtx): Promise<CheckReport> {
    const unique = [...new Set(ids)].toSorted(compareStrings);
    const selected: CheckDef[] = [];
    for (const id of unique) {
      const check = this.#checks.get(id);
      if (!check) {
        const known = this.ids();
        throw new Error(
          `Unknown check id "${id}". Known checks: ${known.length > 0 ? known.join(", ") : "(none)"}.`,
        );
      }
      selected.push(check);
    }

    const records: CheckRunRecord[] = [];
    for (const check of selected) {
      const findings = await runOne(check, ctx);
      records.push({
        id: check.id,
        description: check.description,
        findings: findings.toSorted(compareFindings),
      });
    }

    return buildReport(records);
  }
}

/**
 * Runtime shape validation for findings. Checks may come from untyped
 * third-party JS plugins (src/plugin.ts `checks` slot), so the TS types are no
 * guarantee: a missing/non-string `message` would crash the sort comparator,
 * and an unknown `severity` would corrupt SEVERITY_RANK ordering and the
 * summary counts (NaN buckets, `ok` staying true).
 */
function isWellFormedFinding(value: unknown): value is Omit<Finding, "checkId"> {
  if (value === null || typeof value !== "object") return false;
  const f = value as Record<string, unknown>;
  return (
    typeof f["message"] === "string" &&
    typeof f["severity"] === "string" &&
    (SEVERITIES as readonly string[]).includes(f["severity"]) &&
    (f["path"] === undefined || typeof f["path"] === "string") &&
    (f["fix"] === undefined || typeof f["fix"] === "string")
  );
}

/**
 * Run a single check, stamping `checkId` and converting an unexpected throw or
 * a malformed findings batch into an error-severity finding so one broken
 * check cannot take down the whole doctor run.
 */
async function runOne(check: CheckDef, ctx: CheckCtx): Promise<Finding[]> {
  try {
    const findings: unknown = await check.run(ctx);
    if (!Array.isArray(findings) || !findings.every(isWellFormedFinding)) {
      return [
        {
          checkId: check.id,
          severity: "error",
          message:
            `Check "${check.id}" returned malformed findings (each finding needs a string ` +
            `"message" and a "severity" of ${SEVERITIES.join("|")}); its findings were replaced ` +
            "with this error.",
        },
      ];
    }
    return findings.map((f) => ({ ...f, checkId: check.id }));
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    return [
      {
        checkId: check.id,
        severity: "error",
        message: `Check "${check.id}" failed to run: ${message}`,
      },
    ];
  }
}

function buildReport(records: CheckRunRecord[]): CheckReport {
  const findings = records.flatMap((r) => r.findings).toSorted(compareFindings);
  const counts: Record<Severity, number> = { error: 0, warn: 0, info: 0 };
  for (const finding of findings) counts[finding.severity] += 1;

  // Key order here IS the --json contract; keep it stable.
  return {
    ok: counts.error === 0,
    summary: {
      total: findings.length,
      error: counts.error,
      warn: counts.warn,
      info: counts.info,
    },
    checks: records,
    findings,
  };
}
