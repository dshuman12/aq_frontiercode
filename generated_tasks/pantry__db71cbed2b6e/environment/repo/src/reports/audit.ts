// One-shot consistency audit. Combines healthcheck + staple + duplicate
// barcode + recipe-references-missing-slug.

import type { Item } from "../core/item.js";
import type { Recipe } from "../core/recipe.js";
import type { Profile } from "../core/profile.js";
import { check as healthCheck } from "./healthcheck.js";
import { audit as stapleAudit, notOK as stapleNotOK } from "./staple.js";

export interface AuditFinding {
  category: "health" | "staple" | "duplicate" | "recipe-missing-slug";
  severity: "info" | "warn" | "high";
  detail: string;
  itemSlug?: string;
}

export interface AuditResult {
  findings: AuditFinding[];
  totalsBySeverity: Record<string, number>;
}

export function runFullAudit(opts: {
  items: Item[];
  recipes?: Recipe[];
  profile?: Profile;
}): AuditResult {
  const findings: AuditFinding[] = [];
  for (const f of healthCheck(opts.items)) {
    const finding: AuditFinding = {
      category: "health",
      severity: f.code === "duplicate-slug" ? "high" : "warn",
      detail: f.detail,
    };
    if (f.itemId !== undefined) {
      const item = opts.items.find((i) => i.id === f.itemId);
      if (item?.slug) finding.itemSlug = item.slug;
    }
    findings.push(finding);
  }

  const seenBarcodes = new Map<string, string>();
  for (const item of opts.items) {
    if (!item.barcode) continue;
    const prev = seenBarcodes.get(item.barcode);
    if (prev) {
      findings.push({
        category: "duplicate",
        severity: "warn",
        itemSlug: item.slug,
        detail: `barcode ${item.barcode} also assigned to ${prev}`,
      });
    } else {
      seenBarcodes.set(item.barcode, item.slug);
    }
  }

  if (opts.recipes && opts.items.length > 0) {
    const validSlugs = new Set(opts.items.map((i) => i.slug));
    for (const r of opts.recipes) {
      for (const ing of r.ingredients) {
        if (!validSlugs.has(ing.slug)) {
          findings.push({
            category: "recipe-missing-slug",
            severity: "info",
            detail: `recipe ${r.slug} references unknown slug ${ing.slug}`,
          });
        }
      }
    }
  }

  if (opts.profile) {
    for (const status of stapleNotOK(stapleAudit(opts.profile, opts.items))) {
      findings.push({
        category: "staple",
        severity: "warn",
        itemSlug: status.slug,
        detail: `staple ${status.slug} short by ${status.needValue.toFixed(1)} ${status.required.unitKind}`,
      });
    }
  }

  const totals: Record<string, number> = { info: 0, warn: 0, high: 0 };
  for (const f of findings) totals[f.severity] = (totals[f.severity] ?? 0) + 1;

  return { findings, totalsBySeverity: totals };
}

export function format(result: AuditResult): string {
  const lines: string[] = [];
  for (const sev of ["high", "warn", "info"] as const) {
    const subset = result.findings.filter((f) => f.severity === sev);
    if (subset.length === 0) continue;
    lines.push(`# ${sev} (${subset.length})`);
    for (const f of subset) {
      const id = f.itemSlug ? ` [${f.itemSlug}]` : "";
      lines.push(`- ${f.category}:${id} ${f.detail}`);
    }
    lines.push("");
  }
  if (lines.length === 0) lines.push("# all clear");
  return lines.join("\n") + "\n";
}
